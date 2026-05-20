'use strict'

const test = require('brittle')
const { daysTo24HrIntervals, isCurrentDay, getNestedProperty, getValue, sortThings } = require('../../workers/lib/util')

test('daysTo24HrIntervals', async (t) => {
  t.test('should generate intervals for 1 day', async (t) => {
    const intervals = daysTo24HrIntervals(1)
    t.is(intervals.length, 1, 'should return 1 interval')
    t.ok(intervals[0].startTs, 'should have startTs')
    t.ok(intervals[0].endTs, 'should have endTs')
    t.is(intervals[0].index, 0, 'should have index 0')
    t.ok(intervals[0].endTs >= intervals[0].startTs, 'endTs should be >= startTs')
  })

  t.test('should generate intervals for multiple days', async (t) => {
    const days = 3
    const intervals = daysTo24HrIntervals(days)
    t.is(intervals.length, days, 'should return correct number of intervals')

    for (let i = 0; i < intervals.length; i++) {
      t.is(intervals[i].index, i, `interval ${i} should have correct index`)
      if (i > 0) {
        t.ok(intervals[i].endTs <= intervals[i - 1].startTs, 'intervals should be sequential')
      }
    }
  })

  t.test('should handle UTC offset', async (t) => {
    const utcOffsetMs = 5 * 60 * 60 * 1000 // 5 hours
    const intervals = daysTo24HrIntervals(1, utcOffsetMs)
    t.is(intervals.length, 1, 'should return 1 interval')
    t.ok(intervals[0].startTs, 'should have startTs')
    t.ok(intervals[0].endTs, 'should have endTs')
  })

  t.test('should generate intervals with correct 24-hour spacing', async (t) => {
    const intervals = daysTo24HrIntervals(2)
    const MS_24_HOURS = 24 * 60 * 60 * 1000
    // Check the difference between start times of consecutive intervals
    const diff = intervals[0].startTs - intervals[1].startTs
    // Should be exactly 24 hours apart
    t.is(diff, MS_24_HOURS, 'intervals should be exactly 24 hours apart')
  })
})

test('isCurrentDay', async (t) => {
  t.test('should return true for current timestamp', async (t) => {
    const now = Date.now()
    t.ok(isCurrentDay(now), 'current timestamp should be current day')
  })

  t.test('should return false for yesterday', async (t) => {
    const yesterday = Date.now() - (24 * 60 * 60 * 1000)
    t.not(isCurrentDay(yesterday), 'yesterday should not be current day')
  })

  t.test('should handle UTC offset', async (t) => {
    const utcOffsetMs = 5 * 60 * 60 * 1000 // 5 hours
    const now = Date.now()
    const result = isCurrentDay(now, utcOffsetMs)
    t.ok(typeof result === 'boolean', 'should return boolean')
  })

  t.test('should return false for future date', async (t) => {
    const tomorrow = Date.now() + (24 * 60 * 60 * 1000)
    t.not(isCurrentDay(tomorrow), 'tomorrow should not be current day')
  })
})

test('getNestedProperty', async (t) => {
  t.test('should get top-level property', async (t) => {
    const obj = { name: 'test', value: 123 }
    t.is(getNestedProperty(obj, ['name']), 'test', 'should return top-level property')
    t.is(getNestedProperty(obj, ['value']), 123, 'should return top-level property')
  })

  t.test('should get nested property', async (t) => {
    const obj = {
      level1: {
        level2: {
          value: 'nested'
        }
      }
    }
    t.is(getNestedProperty(obj, ['level1', 'level2', 'value']), 'nested', 'should return nested property')
  })

  t.test('should return undefined for missing property', async (t) => {
    const obj = { name: 'test' }
    t.is(getNestedProperty(obj, ['missing']), undefined, 'should return undefined for missing property')
    t.is(getNestedProperty(obj, ['level1', 'level2']), undefined, 'should return undefined for missing nested property')
  })

  t.test('should handle null/undefined object', async (t) => {
    t.is(getNestedProperty(null, ['prop']), undefined, 'should return undefined for null')
    t.is(getNestedProperty(undefined, ['prop']), undefined, 'should return undefined for undefined')
  })

  t.test('should handle empty path', async (t) => {
    const obj = { name: 'test' }
    try {
      getNestedProperty(obj, [])
      t.fail('should throw or return undefined for empty path')
    } catch (err) {
      t.pass('should handle empty path gracefully')
    }
  })

  t.test('should handle array indices in path', async (t) => {
    const obj = {
      items: [
        { name: 'first' },
        { name: 'second' }
      ]
    }
    t.is(getNestedProperty(obj, ['items', '0', 'name']), 'first', 'should handle array indices')
  })
})

test('getValue', async (t) => {
  t.test('should get nested value by dot path', async (t) => {
    const obj = { stats: { hashrate: 100 } }
    t.is(getValue(obj, 'stats.hashrate'), 100, 'should return nested value')
  })

  t.test('should return undefined for missing path', async (t) => {
    t.is(getValue({ a: 1 }, 'b.c'), undefined, 'should return undefined')
    t.is(getValue(null, 'a'), null, 'should return null when root object is null')
  })
})

test('sortThings', async (t) => {
  t.test('should return 1 when sortBy is empty', async (t) => {
    t.is(sortThings({ id: 'a' }, { id: 'b' }, {}), 1, 'should maintain order when sortBy empty')
    t.is(sortThings({ id: 'a' }, { id: 'b' }, null), 1, 'should maintain order when sortBy null')
  })

  t.test('should sort numerically ascending', async (t) => {
    const things = [
      { meta: { rank: '10' } },
      { meta: { rank: '2' } },
      { meta: { rank: '1' } }
    ]
    things.sort((a, b) => sortThings(a, b, { 'meta.rank': 1 }))
    t.is(things[0].meta.rank, '1', 'should sort 1 first')
    t.is(things[1].meta.rank, '2', 'should sort 2 second')
    t.is(things[2].meta.rank, '10', 'should sort 10 last')
  })

  t.test('should sort descending with negative order', async (t) => {
    const things = [
      { name: 'alpha' },
      { name: 'beta' }
    ]
    things.sort((a, b) => sortThings(a, b, { name: -1 }))
    t.is(things[0].name, 'beta', 'should sort beta first when descending')
    t.is(things[1].name, 'alpha', 'should sort alpha second when descending')
  })

  t.test('should sort by token count when shared prefix matches', async (t) => {
    t.is(
      sortThings({ label: 'abc-def' }, { label: 'abc' }, { label: 1 }),
      1,
      'more tokens should sort after shorter match'
    )
    t.is(sortThings({ label: 'same' }, { label: 'same' }, { label: 1 }), 0, 'equal labels should be stable')
  })

  t.test('should place undefined values last', async (t) => {
    t.is(
      sortThings({ meta: { rank: 1 } }, { meta: {} }, { 'meta.rank': 1 }),
      -1,
      'defined should sort before undefined'
    )
    t.is(
      sortThings({ meta: {} }, { meta: { rank: 1 } }, { 'meta.rank': 1 }),
      1,
      'undefined should sort after defined'
    )
  })
})
