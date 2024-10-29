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
});
