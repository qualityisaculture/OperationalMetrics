import { defaultJiraJSON } from "../Jira.test";
import ThroughputGraphManager, { ThroughputDataType } from "../../../src/server/graphManagers/ThroughputGraphManager";
import JiraRequester from "../../../src/server/JiraRequester";
import Jira from "../../../src/server/Jira";
jest.mock('../../../src/server/JiraRequester');

describe('ThroughputGraphManager', () => {
    let mockJiraRequester: JiraRequester
    let mockJira: Jira
    let mockJira2WeeksAgo: Jira

    beforeEach(() => {
        jest.useFakeTimers()
        jest.resetAllMocks()
        mockJira = new Jira(defaultJiraJSON)
        mockJira2WeeksAgo = new Jira({...defaultJiraJSON, fields: {...defaultJiraJSON.fields, resolutiondate: '2024-10-07T12:00:00.000Z'}})
        mockJiraRequester = new JiraRequester()
        mockJiraRequester.getQuery = jest.fn().mockResolvedValue([mockJira, mockJira2WeeksAgo])
    })

    it('should request the query from the Jirarequest', async () => {
        let tgm = new ThroughputGraphManager(mockJiraRequester)
        await tgm.getThroughputData('project="Project 1"', new Date('2024-10-31'), 0)
        expect(mockJiraRequester.getQuery).toHaveBeenCalledWith('project="Project 1" AND status="Done" AND resolved >= 2024-10-31')
    });

    it('should request the data for all sprints', async () => {
        let tgm = new ThroughputGraphManager(mockJiraRequester)
        await tgm.getThroughputData('project="Project 1"', new Date('2024-10-31'), 1)
        expect(mockJiraRequester.getQuery).toHaveBeenCalledWith('project="Project 1" AND status="Done" AND resolved >= 2024-10-17')

        await tgm.getThroughputData('project="Project 1"', new Date('2024-10-31'), 2)
        expect(mockJiraRequester.getQuery).toHaveBeenCalledWith('project="Project 1" AND status="Done" AND resolved >= 2024-10-03')
    });

    it('should return the data in two week intervals', async () => {
        let tgm = new ThroughputGraphManager(mockJiraRequester)
        let result: ThroughputDataType[] = await tgm.getThroughputData('project="Project 1"', new Date('2024-10-21T09:00:00.000Z'), 1);
        expect(result[0].sprintStartingDate).toEqual(new Date('2024-10-21T09:00:00.000Z'));
        expect(result[1].sprintStartingDate).toEqual(new Date('2024-10-07T09:00:00.000Z'));
    });
});