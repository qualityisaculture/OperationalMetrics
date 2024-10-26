import { defaultJiraJSON } from "../../test/server/Jira.test";

import BurnupGraphManager from '../../src/server/BurnupGraphManager';
import JiraRequester from '../../src/server/JiraRequester';
import Jira from '../../src/server/Jira';
jest.mock('../../src/server/JiraRequester');

describe('BurnupGraphManager', () => {
  let mockJiraRequester: JiraRequester;
  let mockJira: Jira;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
    mockJira = new Jira(defaultJiraJSON);
    mockJiraRequester = new JiraRequester();
    mockJiraRequester.getJira = jest.fn().mockResolvedValue(mockJira);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should request the epic from the Jirarequest', async () => {
    let bgm = new BurnupGraphManager(mockJiraRequester);
    await bgm.getEpicBurnupData('KEY-1');
    expect(mockJiraRequester.getJira).toHaveBeenCalledWith('KEY-1');
  });

  it('should request the children', async () => {
    mockJira.getChildrenKeys = jest.fn().mockReturnValue(['KEY-2']);
    let bgm = new BurnupGraphManager(mockJiraRequester);
    await bgm.getEpicBurnupData('KEY-1');
    expect(mockJiraRequester.getJira).toHaveBeenCalledWith('KEY-2');
  });

  it('should return a list of keys between start date and current date', async () => {
    mockJira.created = new Date('2024-10-21T09:00:00.000Z');
    jest.setSystemTime(new Date('2024-10-22').getTime());

    let bgm = new BurnupGraphManager(mockJiraRequester);
    let result = await bgm.getEpicBurnupData('KEY-1');
    expect(result.length).toEqual(2);
    expect(result[0].date).toEqual(new Date('2024-10-21T09:00:00.000Z'));
    expect(result[1].date).toEqual(new Date('2024-10-22T09:00:00.000Z'));
  });

  it('should return a list of keys between start date and current date', async () => {
    mockJira.created = new Date('2024-10-21T09:00:00.000Z');
    jest.setSystemTime(new Date('2024-10-24').getTime());

    mockJira.getChildrenKeys = jest.fn().mockReturnValue(['KEY-2']);
    let childJira = getJiraCompletedOnDate('2024-10-21T00:00:00.000Z',);
    mockJiraRequester.getJira = jest
      .fn()
      .mockResolvedValueOnce(mockJira)
      .mockResolvedValueOnce(childJira);

    let bgm = new BurnupGraphManager(mockJiraRequester);
    let result = await bgm.getEpicBurnupData('KEY-1');
    expect(result.length).toEqual(4);
    expect(result[0].doneKeys).toEqual(['KEY-2']);
    expect(result[1].doneKeys).toEqual(['KEY-2']);
  });



  it('should not return a child key if it is not done yet', async () => {
    mockJira.created = new Date('2024-10-21T09:00:00.000Z');
    jest.setSystemTime(new Date('2024-10-24').getTime());

    mockJira.getChildrenKeys = jest.fn().mockReturnValue(['KEY-2']);
    let childJira = getJiraCompletedOnDate('2024-10-22T00:00:00.000Z');
    mockJiraRequester.getJira = jest
      .fn()
      .mockResolvedValueOnce(mockJira)
      .mockResolvedValueOnce(childJira);

    let bgm = new BurnupGraphManager(mockJiraRequester);
    let result = await bgm.getEpicBurnupData('KEY-1');
    expect(result.length).toEqual(4);
    expect(result[0].doneKeys).toEqual([]);
    expect(result[1].doneKeys).toEqual(['KEY-2']);
  });
});

function getJiraCompletedOnDate(date: string) {
  return new Jira({
    ...defaultJiraJSON,
    key: 'KEY-2',
    changelog: {
      histories: [
        {
          created: date,
          items: [
            { field: 'status', fromString: 'Backlog', toString: 'Done' },
          ],
        },
      ],
    },
  });
}
