import { defaultJiraJSON } from '../../test/server/Jira.test';

import EstimatesGraphManager from '../../src/server/EstimatesGraphManager';
import JiraRequester from '../../src/server/JiraRequester';
import Jira from '../../src/server/Jira';
jest.mock('../../src/server/JiraRequester');

describe('EstimatesGraphManager', () => {
  let mockJiraRequester: JiraRequester;
  let mockJira: Jira;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
    mockJiraRequester = new JiraRequester();
    mockJira = new Jira(defaultJiraJSON);
    mockJiraRequester.getQuery = jest.fn().mockResolvedValue([mockJira]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should request the query from the Jirarequest', async () => {
    let egm = new EstimatesGraphManager(mockJiraRequester);
    await egm.getEpicEstimatesData('project="Project 1" AND resolved >= -1w');
    expect(mockJiraRequester.getQuery).toHaveBeenCalledWith('project="Project 1" AND resolved >= -1w');
  });

  describe('getUniqueStatuses', () => {
    it('should return statuses of a jira', () => {
      let egm = new EstimatesGraphManager(mockJiraRequester);
      let jira = new Jira({
        ...defaultJiraJSON,
        changelog: {
          histories: [
            {
              items: [
                { field: 'status', fromString: 'Backlog', toString: 'In Progress' },
                { field: 'status', fromString: 'In Progress', toString: 'Done' },
              ],
            },
          ],
        },
      });
      expect(egm.getUniqueStatuses([jira])).toEqual(['Backlog', 'Done', 'In Progress', ]);
    })

    it('should return unique statuses of multiple jiras', () => {
      let egm = new EstimatesGraphManager(mockJiraRequester);
      let jira1 = new Jira({
        ...defaultJiraJSON,
        changelog: {
          histories: [
            {
              items: [
                { field: 'status', fromString: 'Backlog', toString: 'In Progress' },
                { field: 'status', fromString: 'In Progress', toString: 'Done' },
              ],
            },
          ],
        },
      });
      let jira2 = new Jira({
        ...defaultJiraJSON,
        changelog: {
          histories: [
            {
              items: [
                { field: 'status', fromString: 'In Progress', toString: 'Done' },
              ],
            },
          ],
        },
      });
      expect(egm.getUniqueStatuses([jira1, jira2])).toEqual(['Backlog', 'Done', 'In Progress', ]);
    });
  });
});
