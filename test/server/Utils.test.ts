import { inWorkDay, getWorkHoursBetween } from '../../src/server/Utils';

describe('inWorkDay', () => {
  it ('should always return false for Saturday and Sunday', () => {
    let date = new Date('2024-10-19T09:00:00.000Z');
    expect(inWorkDay(date)).toEqual(false);
    date = new Date('2024-10-20T09:00:00.000Z');
    expect(inWorkDay(date)).toEqual(false);
  });

  it('should return false prior to 9am on a Monday', () => {
    let date = new Date('2024-10-21T08:59:59.999Z');
    expect(inWorkDay(date)).toEqual(false);
  });

  it('should return true after 9am on a Monday', () => {
    let date = new Date('2024-10-21T09:00:00.000Z');
    expect(inWorkDay(date)).toEqual(true);
  });

  it('should return false after 5pm on a Monday', () => {
    let date = new Date('2024-10-21T17:00:00.000Z');
    expect(inWorkDay(date)).toEqual(false);
  });
});

describe('getWorkHoursBetween', () => {
  it('should return 0 for the same date', () => {
    let date1 = new Date('2024-10-21T09:00:00.000Z');
    let date2 = new Date('2024-10-21T09:00:00.000Z');
    expect(getWorkHoursBetween(date1, date2)).toEqual(0);
  });

  it('should return 0 if less than an hour', () => {
    let date1 = new Date('2024-10-21T09:00:00.000Z');
    let date2 = new Date('2024-10-21T09:59:59.999Z');
    expect(getWorkHoursBetween(date1, date2)).toEqual(0);
  });

  it('should return 8 hours for a single work day', () => {
    let date1 = new Date('2024-10-21T09:00:00.000Z');
    let date2 = new Date('2024-10-21T17:00:00.000Z');
    expect(getWorkHoursBetween(date1, date2)).toEqual(8);
  });

  it('should return 8 hours if starts at 9:59 (even though it is really 7ish)', () => {
    let date1 = new Date('2024-10-21T09:59:00.000Z');
    let date2 = new Date('2024-10-21T17:00:00.000Z');
    expect(getWorkHoursBetween(date1, date2)).toEqual(8);
  });

  it('should return 16 hours for two work days', () => {
    let date1 = new Date('2024-10-21T09:00:00.000Z');
    let date2 = new Date('2024-10-22T17:00:00.000Z');
    expect(getWorkHoursBetween(date1, date2)).toEqual(16);
  });

  it('should return 40 hours for a full week', () => {
    let date1 = new Date('2024-10-21T09:00:00.000Z');
    let date2 = new Date('2024-10-28T09:00:00.000Z');
    expect(getWorkHoursBetween(date1, date2)).toEqual(40);
  });

  it('should return 80 hours for two full weeks', () => {
    let date1 = new Date('2024-10-14T09:00:00.000Z');
    let date2 = new Date('2024-10-28T09:00:00.000Z');
    expect(getWorkHoursBetween(date1, date2)).toEqual(80);
  });
});