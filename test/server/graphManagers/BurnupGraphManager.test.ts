import { defaultJiraJSON } from '../Jira.test';

import BurnupGraphManager from '../../../src/server/graphManagers/BurnupGraphManager';
import JiraRequester from '../../../src/server/JiraRequester';
import Jira from '../../../src/server/Jira';
jest.mock('../../../src/server/JiraRequester');

describe('BurnupGraphManager', () => {
  let mockJiraRequester: JiraRequester;
  let mockJira: Jira;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
    mockJira = new Jira(defaultJiraJSON);
    mockJiraRequester = new JiraRequester();
    mockJiraRequester.getFullJiraDataFromKeys = jest.fn().mockResolvedValue([mockJira]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should request the epic from the Jirarequest', async () => {
    mockJiraRequester.getQuery = jest.fn().mockResolvedValue([mockJira]);
    let bgm = new BurnupGraphManager(mockJiraRequester);
    await bgm.getEpicBurnupData('key=KEY-1');
    expect(mockJiraRequester.getQuery).toHaveBeenCalledWith('key=KEY-1');
  });

  it('should request the children', async () => {
    mockJiraRequester.getQuery = jest.fn().mockResolvedValue([mockJira]);
    mockJira.getChildrenKeys = jest.fn().mockReturnValue(['KEY-2']);
    let bgm = new BurnupGraphManager(mockJiraRequester);
    await bgm.getEpicBurnupData('key=KEY-1');
    expect(mockJiraRequester.getFullJiraDataFromKeys).toHaveBeenCalledWith(['KEY-2']);
  });

  describe('Get the Start and End Date', () => {

    it('should use the epic start date if it exists', async () => {
      mockJira = new Jira({
        ...defaultJiraJSON,
        fields: {...defaultJiraJSON.fields, customfield_10015: '2024-10-23'}
      });
      mockJiraRequester.getQuery = jest.fn().mockResolvedValue([mockJira]);

      let bgm = new BurnupGraphManager(mockJiraRequester);
      let results = await bgm.getEpicBurnupData('key=KEY-1');
      let result = results[0];
      expect(result[0].date).toEqual(new Date('2024-10-23Z'));
    });

    it('should use the created date if the epic start date does not exist', async () => {
      mockJira = new Jira({
        ...defaultJiraJSON,
        fields: {...defaultJiraJSON.fields}
      });
      mockJiraRequester.getQuery = jest.fn().mockResolvedValue([mockJira]);

      let bgm = new BurnupGraphManager(mockJiraRequester);
      let results = await bgm.getEpicBurnupData('key=KEY-1');
      let result = results[0];
      expect(result[0].date).toEqual(new Date('2024-10-21T09:00:00.000Z'));
    });

    it('should use the epic due date if it exists', async () => {
      mockJira = new Jira({
        ...defaultJiraJSON,
        fields: {...defaultJiraJSON.fields, customfield_10015: '2024-10-28', duedate: '2024-10-30'}
      });
      mockJiraRequester.getQuery = jest.fn().mockResolvedValue([mockJira]);

      let bgm = new BurnupGraphManager(mockJiraRequester);
      let results = await bgm.getEpicBurnupData('key=KEY-1');
      let result = results[0];
      expect(result[result.length - 1].date).toEqual(new Date('2024-10-30Z'));
    });

    it('should use the current date if the epic due date does not exist', async () => {
      mockJira = new Jira({
        ...defaultJiraJSON,
        fields: {...defaultJiraJSON.fields, customfield_10015: '2024-10-28'}
      });
      mockJiraRequester.getQuery = jest.fn().mockResolvedValue([mockJira]);

      jest.setSystemTime(new Date('2024-10-30').getTime());
      let bgm = new BurnupGraphManager(mockJiraRequester);
      let results = await bgm.getEpicBurnupData('key=KEY-1');
      let result = results[0];
      expect(result[result.length - 1].date).toEqual(new Date('2024-10-30Z'));
    });

    it('should return a list of dates between start date and current date', async () => {
      mockJira = new Jira({
        ...defaultJiraJSON,
        fields: {...defaultJiraJSON.fields, customfield_10015: '2024-10-28', duedate: '2024-10-30'}
      });
      mockJiraRequester.getQuery = jest.fn().mockResolvedValue([mockJira]);

      let bgm = new BurnupGraphManager(mockJiraRequester);
      let results = await bgm.getEpicBurnupData('key=KEY-1');
      let result = results[0];
      expect(result.length).toEqual(3);
      expect(result[0].date).toEqual(new Date('2024-10-28Z'));
      expect(result[1].date).toEqual(new Date('2024-10-29Z'));
      expect(result[2].date).toEqual(new Date('2024-10-30Z'));
    });
  });

  describe('Get the Done Data', () => {
    it('should return a list of done keys between start date and current date', async () => {
      jest.setSystemTime(new Date('2024-10-24').getTime());

      mockJira.getChildrenKeys = jest.fn().mockReturnValue(['KEY-2']);
      let childJira = getJiraCompletedOnDate('2024-10-21T00:00:00.000Z');

      mockJiraRequester.getQuery = jest.fn().mockResolvedValue([mockJira]);
      mockJiraRequester.getFullJiraDataFromKeys = jest
        .fn().mockResolvedValue([childJira]);

      let bgm = new BurnupGraphManager(mockJiraRequester);
      let results = await bgm.getEpicBurnupData('key=KEY-1');
      let result = results[0];
      expect(result.length).toEqual(4);
      expect(result[0].doneKeys).toEqual(['KEY-2']);
      expect(result[1].doneKeys).toEqual(['KEY-2']);
    });

    it('should not return a child key if it is not done yet', async () => {
      jest.setSystemTime(new Date('2024-10-24').getTime());

      mockJira.getChildrenKeys = jest.fn().mockReturnValue(['KEY-2']);
      let childJira = getJiraCompletedOnDate('2024-10-22T00:00:00.000Z');
      mockJiraRequester.getQuery = jest.fn().mockResolvedValue([mockJira]);
      mockJiraRequester.getFullJiraDataFromKeys = jest
        .fn()
        .mockResolvedValue([childJira]);

      let bgm = new BurnupGraphManager(mockJiraRequester);
      let results = await bgm.getEpicBurnupData('key=KEY-1');
      let result = results[0];
      expect(result.length).toEqual(4);
      expect(result[0].doneKeys).toEqual([]);
      expect(result[1].doneKeys).toEqual(['KEY-2']);
    });
  });

  describe('Get the Scope Data', () => {
    it('should return a list of scope keys between start date and current date', async () => {
      jest.setSystemTime(new Date('2024-10-24').getTime());

      mockJira.getChildrenKeys = jest.fn().mockReturnValue(['KEY-2']);
      let childJira = getJiraCompletedOnDate('2024-10-21T00:00:00.000Z');
      mockJiraRequester.getQuery = jest.fn().mockResolvedValue([mockJira]);
      mockJiraRequester.getFullJiraDataFromKeys = jest
        .fn()
        .mockResolvedValue([childJira]);

      let bgm = new BurnupGraphManager(mockJiraRequester);
      let results = await bgm.getEpicBurnupData('key=KEY-1');
      let result = results[0];
      expect(result.length).toEqual(4);
      expect(result[0].scopeKeys).toEqual(['KEY-2']);
      expect(result[1].scopeKeys).toEqual(['KEY-2']);
    });

    it('should not return a child key if it is not in scope yet', async () => {
      mockJira = new Jira({
        ...defaultJiraJSON,
        changelog: {
          histories: [
            {
              created: '2024-10-20T09:46:38.582+0100',
              items: [
                { field: 'Epic Child', fromString: '', toString: 'KEY-2' },
              ],
            },
          ],
        },
      });
      jest.setSystemTime(new Date('2024-10-24').getTime());

      let childJira = getJiraCancelledOnDate('2024-10-22T00:00:00.000Z');
      mockJiraRequester.getQuery = jest.fn().mockResolvedValue([mockJira]);
      mockJiraRequester.getFullJiraDataFromKeys = jest
        .fn()
        .mockResolvedValue([childJira]);

      let bgm = new BurnupGraphManager(mockJiraRequester);
      let results = await bgm.getEpicBurnupData('key=KEY-1');
      let result = results[0];
      expect(result.length).toEqual(4);
      expect(result[0].scopeKeys).toEqual(['KEY-2']);
      expect(result[1].scopeKeys).toEqual([]);
    });

    it('should not return a child key if it has not been added yet', async () => {
      mockJira = new Jira({
        ...defaultJiraJSON,
        changelog: {
          histories: [
            {
              created: '2024-10-22T09:46:38.582+0100',
              items: [
                { field: 'Epic Child', fromString: '', toString: 'KEY-2' },
              ],
            },
          ],
        },
      });

      jest.setSystemTime(new Date('2024-10-24').getTime());

      let childJira = getJiraCancelledOnDate('2024-10-24T00:00:00.000Z');
      mockJiraRequester.getQuery = jest.fn().mockResolvedValue([mockJira]);
      mockJiraRequester.getFullJiraDataFromKeys = jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([childJira])
        .mockResolvedValueOnce([childJira])
        .mockResolvedValue([]);

      let bgm = new BurnupGraphManager(mockJiraRequester);
      let results = await bgm.getEpicBurnupData('key=KEY-1');
      let result = results[0];
      expect(result.length).toEqual(4);
      expect(result[0].scopeKeys).toEqual([]);
      expect(result[1].scopeKeys).toEqual(['KEY-2']);
      expect(result[2].scopeKeys).toEqual(['KEY-2']);
      expect(result[3].scopeKeys).toEqual([]);
    });
  });
});

function getJiraCompletedOnDate(date: string) {
  return getJiraTransitedOnDate(date, 'In Progress', 'Done');
}

function getJiraCancelledOnDate(date: string) {
  return getJiraTransitedOnDate(date, 'In Progress', 'Cancelled');
}

function getJiraTransitedOnDate(date: string, from: string, to: string) {
  return new Jira({
    ...defaultJiraJSON,
    key: 'KEY-2',
    changelog: {
      histories: [
        {
          created: date,
          items: [{ field: 'status', fromString: from, toString: to }],
        },
      ],
    },
  });
}
