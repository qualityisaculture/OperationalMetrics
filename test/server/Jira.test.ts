import Jira, { JiraJson, JiraJsonFields } from '../../src/server/Jira';

let nineAm = '2024-10-21T09:00:00.000Z';
let nineThirtyAm = '2024-10-21T09:30:00.000Z';
let tenAm = '2024-10-21T10:00:00.000Z';
let tenThirtyAm = '2024-10-21T10:30:00.000Z';
let elevenAm = '2024-10-21T11:00:00.000Z';
let twelvePm = '2024-10-21T12:00:00.000Z';
let midnight = '2024-10-22T00:00:00.000Z';
export const defaultJiraJSONFields: JiraJsonFields = {
  created: nineAm,
  components: [{ name: 'Component' }],
  fixVersions: [{ name: 'Version' }],
  issuetype: { name: 'Task' },
  labels: [],
  priority: { name: 'Medium' },
  resolutiondate: '2024-10-24T10:00:00.000Z',
  resolution: 'Done',
  status: { name: 'Backlog' },
  summary: 'Summary',
};
export const defaultJiraJSON = { key: 'KEY-1', fields: defaultJiraJSONFields };

describe('Jira', () => {
  describe('fields', () => {
    it('should return the key', () => {
      let jira = new Jira({ ...defaultJiraJSON, key: 'KEY-2' });
      expect(jira.getKey()).toEqual('KEY-2');
    });

    it('should return the components', () => {
      let jira = new Jira(defaultJiraJSON);
      expect(jira.getComponents()).toEqual(['Component']);
    });

    it('should return the created date', () => {
      let jira = new Jira(defaultJiraJSON);
      expect(jira.getCreated()).toEqual(new Date(nineAm));
    });

    it('should return the epic', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: {
          ...defaultJiraJSONFields,
          parent: { key: 'EPIC-1', fields: { issuetype: { name: 'Epic'}, summary: 'Epic Name' } },
        },
      });
      expect(jira.getEpicKey()).toEqual('EPIC-1');
    });

    it('should return null if no epic', () => {
      let jira = new Jira(defaultJiraJSON);
      expect(jira.getEpicKey()).toEqual(null);
    });

    it('should return null if parent is an initaitive', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: {
          ...defaultJiraJSONFields,
          parent: { key: 'EPIC-1', fields: { issuetype: { name: 'Initiative'}, summary: 'Epic Name' } },
        },
      });
      expect(jira.getEpicKey()).toEqual(null);
    });

    it('should return the epic name', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: {
          ...defaultJiraJSONFields,
          parent: { key: 'EPIC-1', fields: { issuetype: { name: 'Epic'}, summary: 'Epic Name' } },
        },
      });
      expect(jira.getEpicName()).toEqual('Epic Name');
    });

    it('should return the initiative key if exists', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: {
          ...defaultJiraJSONFields,
          parent: { key: 'INIT-1', fields: { issuetype: { name: 'Initiative'}, summary: 'Initiative Name' } },
        },
      });
      expect(jira.getInitiativeKey()).toEqual('INIT-1');
    });

    it('should return null if no initiative key', () => {
      let jira = new Jira(defaultJiraJSON);
      expect(jira.getInitiativeKey()).toEqual(null);
    });

    it('should return the initiative name if exists', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: {
          ...defaultJiraJSONFields,
          parent: { key: 'INIT-1', fields: { issuetype: { name: 'Initiative'}, summary: 'Initiative Name' } },
        },
      });
      expect(jira.getInitiativeName()).toEqual('Initiative Name');
    });

    it('should return null if no initiative name', () => {
      let jira = new Jira(defaultJiraJSON);
      expect(jira.getInitiativeName()).toEqual(null);
    });

    it('should get the fix versions', () => {
      let jira = new Jira(defaultJiraJSON);
      expect(jira.getFixVersions()).toEqual(['Version']);
    });

    it('should return the labels', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: { ...defaultJiraJSONFields, labels: ['label1', 'label2'] },
      });
      expect(jira.getLabels()).toEqual(['label1', 'label2']);
    });

    it('should return an empty array if no labels', () => {
      let jira = new Jira(defaultJiraJSON);
      expect(jira.getLabels()).toEqual([]);
    });

    it('should return the summary', () => {
      let jira = new Jira(defaultJiraJSON);
      expect(jira.getSummary()).toEqual('Summary');
    });

    it('should return the priority', () => {
      let jira = new Jira(defaultJiraJSON);
      expect(jira.getPriority()).toEqual('Medium');
    });

    it('should return the resolution', () => {
      let jira = new Jira(defaultJiraJSON);
      expect(jira.getResolution()).toEqual('Done');
    });

    it('should return the resolved date', () => {
      let jira = new Jira(defaultJiraJSON);
      expect(jira.getResolved()).toEqual(new Date('2024-10-24T10:00:00.000Z'));
    });

    it('you should be able to mutate the created date without altering the original', () => {
      let jira = new Jira(defaultJiraJSON);
      let created = jira.getCreated();
      created.setFullYear(2023);
      expect(jira.getCreated()).toEqual(new Date(nineAm));
    });

    it('should return the original estimate', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: { ...defaultJiraJSONFields, timeoriginalestimate: 3600 },
      });
      expect(jira.getOriginalEstimate()).toEqual(3600);
    });

    it('should return null if no original estimate', () => {
      let jira = new Jira(defaultJiraJSON);
      expect(jira.getOriginalEstimate()).toEqual(null);
    });

    it('should return the time spent', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: { ...defaultJiraJSONFields, timespent: 3600 },
      });
      expect(jira.getTimeSpent()).toEqual(3600);
    });

    it('should return null if no time spent', () => {
      let jira = new Jira(defaultJiraJSON);
      expect(jira.getTimeSpent()).toEqual(null);
    });

    it('should return the type', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: { ...defaultJiraJSONFields, issuetype: { name: 'Story' } },
      });
      expect(jira.getType()).toEqual('Story');
    });
  });

  describe('getChildren', () => {
    it('should return nothing with no history', () => {
      let jira = new Jira(defaultJiraJSON);
      expect(jira.getChildrenKeys()).toEqual([]);
    });

    it('should return when setting Epic Child is only history item', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        changelog: {
          histories: [
            {
              items: [
                { field: 'Epic Child', fromString: null, toString: 'KEY-1' },
              ],
            },
          ],
        },
      });
      expect(jira.getChildrenKeys()).toEqual(['KEY-1']);
    });

    it('should return when setting Epic Child has multiple items in a history', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        changelog: {
          histories: [
            {
              items: [
                {
                  field: 'Other Field',
                  fromString: null,
                  toString: 'Other Field',
                },
                { field: 'Epic Child', fromString: null, toString: 'KEY-1' },
                { field: 'Epic Child', fromString: null, toString: 'KEY-2' },
              ],
            },
          ],
        },
      });
      expect(jira.getChildrenKeys()).toEqual(['KEY-1', 'KEY-2']);
    });

    it('should return when setting Epic Child has multiple histories', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        changelog: {
          histories: [
            {
              items: [
                { field: 'Epic Child', fromString: null, toString: 'KEY-1' },
              ],
            },
            {
              items: [
                { field: 'Epic Child', fromString: null, toString: 'KEY-2' },
              ],
            },
          ],
        },
      });
      expect(jira.getChildrenKeys()).toEqual(['KEY-1', 'KEY-2']);
    });

    it('should remove children which are removed in later histories', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        changelog: {
          histories: [
            {
              created: '2024-10-22T09:46:38.582+0100',
              items: [
                { field: 'Epic Child', fromString: 'KEY-1', toString: null },
              ],
            },
            {
              created: '2024-10-20T09:49:29.143+0100',
              items: [
                { field: 'Epic Child', fromString: null, toString: 'KEY-1' },
              ],
            },
          ],
        },
      });
      expect(jira.getChildrenKeys()).toEqual([]);
    });

    it('should return only the children that exist to that point when data is passed', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        changelog: {
          histories: [
            {
              created: '2024-10-21T09:49:29.143Z',
              items: [
                { field: 'Epic Child', fromString: null, toString: 'KEY-1' },
              ],
            },
            {
              created: '2024-10-22T09:49:29.143Z',
              items: [
                { field: 'Epic Child', fromString: 'KEY-1', toString: null },
              ],
            },
          ],
        },
      });
      expect(
        jira.getChildrenKeys(new Date('2024-10-21T09:00:00.000Z'))
      ).toEqual([]);
      expect(
        jira.getChildrenKeys(new Date('2024-10-22T09:00:00.000Z'))
      ).toEqual(['KEY-1']);
      expect(
        jira.getChildrenKeys(new Date('2024-10-23T09:00:00.000Z'))
      ).toEqual([]);
    });
  });

  describe('getStatus', () => {
    it('should return the current state when no date passed', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: { ...defaultJiraJSONFields, status: { name: 'In Progress' } },
      });
      expect(jira.getStatus()).toEqual('In Progress');
    });

    it('should return NOT_CREATED_YET if passed date prior to Jira creation', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: {
          ...defaultJiraJSONFields,
          created: '2024-10-21T09:46:38.582+0100',
        },
      });
      expect(jira.getStatus(new Date('2024-10-20T09:46:38.582+0100'))).toEqual(
        'NOT_CREATED_YET'
      );
    });

    it('should return the starting state if date is prior to first state change', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        changelog: {
          histories: [
            {
              created: tenAm,
              items: [
                {
                  field: 'status',
                  fromString: 'Backlog',
                  toString: 'In Progress',
                },
              ],
            },
          ],
        },
      });
      expect(jira.getStatus(new Date(nineThirtyAm))).toEqual('Backlog');

      let jira2 = new Jira({
        ...defaultJiraJSON,
        changelog: {
          histories: [
            {
              created: tenAm,
              items: [
                {
                  field: 'status',
                  fromString: 'Todo',
                  toString: 'In Progress',
                },
              ],
            },
          ],
        },
      });
      expect(jira2.getStatus(new Date(nineThirtyAm))).toEqual('Todo');
    });

    it('should return the state of the last change before the date', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        changelog: {
          histories: [
            {
              created: nineThirtyAm,
              items: [
                {
                  field: 'status',
                  fromString: 'Backlog',
                  toString: 'In Progress',
                },
              ],
            },
            {
              created: tenAm,
              items: [
                {
                  field: 'status',
                  fromString: 'In Progress',
                  toString: 'Done',
                },
              ],
            },
          ],
        },
      });
      expect(jira.getStatus(new Date(nineThirtyAm))).toEqual('In Progress');
      expect(jira.getStatus(new Date(tenAm))).toEqual('Done');
    });
  });

  describe('getStatuses', () => {
    describe('work hours behaviour', () => {
      it('should return 8 hours, even at midnight', () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date(midnight).getTime());
        let jira = new Jira(defaultJiraJSON);
        expect(jira.getStatusTimes()).toEqual([
          { status: 'Backlog', time: 8 * 3600000 },
        ]);
      });

      it('should return 0 if status is Jira has existed less than hour', () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date(nineThirtyAm).getTime());
        let jira = new Jira(defaultJiraJSON);
        expect(jira.getStatusTimes()).toEqual([{ status: 'Backlog', time: 0 }]);
      });

      it('should round up to the nearest hour', () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date(tenThirtyAm).getTime());
        let jira = new Jira(defaultJiraJSON);
        expect(jira.getStatusTimes()).toEqual([
          { status: 'Backlog', time: 2 * 3600000 },
        ]);
      });
    });

    it('should just return the current status if there are no status changes', () => {
      let jira = new Jira(defaultJiraJSON);
      expect(jira.getStatuses()).toEqual(['Backlog']);
    });

    it('should return all the statuses in alphabetical order', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        changelog: {
          histories: [
            {
              created: nineThirtyAm,
              items: [
                {
                  field: 'status',
                  fromString: 'Backlog',
                  toString: 'In Progress',
                },
              ],
            },
            {
              created: tenAm,
              items: [
                {
                  field: 'status',
                  fromString: 'In Progress',
                  toString: 'Done',
                },
              ],
            },
          ],
        },
      });
      expect(jira.getStatuses()).toEqual(['Backlog', 'Done', 'In Progress']);
    });
  });

  describe('getStatusTimes', () => {
    it('should return the amount of time the jira existed with the current status if there are no status changes', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(tenAm).getTime());
      let jira = new Jira(defaultJiraJSON);
      expect(jira.getStatusTimes()).toEqual([
        { status: 'Backlog', time: 3600000 },
      ]);
    });

    it('should return the amount of time the jira existed with each status', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(tenAm).getTime());
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: { ...defaultJiraJSONFields, status: { name: 'Done' } },
        changelog: {
          histories: [
            {
              created: tenAm,
              items: [
                {
                  field: 'status',
                  fromString: 'Backlog',
                  toString: 'In Progress',
                },
              ],
            },
            {
              created: elevenAm,
              items: [
                {
                  field: 'status',
                  fromString: 'In Progress',
                  toString: 'Done',
                },
              ],
            },
          ],
        },
      });
      expect(jira.getStatusTimes()).toEqual([
        { status: 'Backlog', time: 3600000 },
        { status: 'Done', time: 0 },
        { status: 'In Progress', time: 3600000 },
      ]);
    });

    it('should include the time since the last status change if the jira is still in that status', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(elevenAm).getTime());
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: { ...defaultJiraJSONFields, status: { name: 'In Progress' } },
        changelog: {
          histories: [
            {
              created: tenAm,
              items: [
                {
                  field: 'status',
                  fromString: 'Backlog',
                  toString: 'In Progress',
                },
              ],
            },
          ],
        },
      });
      expect(jira.getStatusTimes()).toEqual([
        { status: 'Backlog', time: 3600000 },
        { status: 'In Progress', time: 3600000 },
      ]);
    });

    it('should add up the times if a status is repeated', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(twelvePm).getTime());
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: { ...defaultJiraJSONFields, status: { name: 'Done' } },
        changelog: {
          histories: [
            {
              created: tenAm,
              items: [
                {
                  field: 'status',
                  fromString: 'Backlog',
                  toString: 'In Progress',
                },
              ],
            },
            {
              created: elevenAm,
              items: [
                {
                  field: 'status',
                  fromString: 'In Progress',
                  toString: 'Backlog',
                },
              ],
            },
          ],
        },
      });
      expect(jira.getStatusTimes()).toEqual([
        { status: 'Backlog', time: 2 * 3600000 },
        { status: 'In Progress', time: 3600000 },
      ]);
    });
  });

  describe('isDone', () => {
    it('should return true if status is Done', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: { ...defaultJiraJSONFields, status: { name: 'Done' } },
      });
      expect(jira.isDone()).toEqual(true);
    });

    it('should return false if status is not Done', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: { ...defaultJiraJSONFields, status: { name: 'In Progress' } },
      });
      expect(jira.isDone()).toEqual(false);
    });

    it('should return true if status is Done at a point in time', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        changelog: {
          histories: [
            {
              created: nineThirtyAm,
              items: [
                {
                  field: 'status',
                  fromString: 'Backlog',
                  toString: 'In Progress',
                },
              ],
            },
            {
              created: tenAm,
              items: [
                {
                  field: 'status',
                  fromString: 'In Progress',
                  toString: 'Done',
                },
              ],
            },
          ],
        },
      });
      expect(jira.isDone(new Date(nineThirtyAm))).toEqual(false);
      expect(jira.isDone(new Date(tenAm))).toEqual(true);
    });

    describe('isInScope', () => {
      it('should return true if status is not Cancelled', () => {
        let jira = new Jira({
          ...defaultJiraJSON,
          fields: { ...defaultJiraJSONFields, status: { name: 'Done' } },
        });
        expect(jira.isInScope()).toEqual(true);
      });

      it('should return false if status is Cancelled', () => {
        let jira = new Jira({
          ...defaultJiraJSON,
          fields: { ...defaultJiraJSONFields, status: { name: 'Cancelled' } },
        });
        expect(jira.isInScope()).toEqual(false);
      });

      it('should return true if status is Cancelled at a point in time', () => {
        let jira = new Jira({
          ...defaultJiraJSON,
          changelog: {
            histories: [
              {
                created: nineThirtyAm,
                items: [
                  {
                    field: 'status',
                    fromString: 'Backlog',
                    toString: 'In Progress',
                  },
                ],
              },
              {
                created: tenAm,
                items: [
                  {
                    field: 'status',
                    fromString: 'In Progress',
                    toString: 'Cancelled',
                  },
                ],
              },
            ],
          },
        });
        expect(jira.isInScope(new Date(nineThirtyAm))).toEqual(true);
        expect(jira.isInScope(new Date(tenAm))).toEqual(false);
      });
    });
  });

  describe('existsOn', () => {
    it('should return true if date is after creation date', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: { ...defaultJiraJSONFields, created: nineAm },
      });
      expect(jira.existsOn(new Date(nineThirtyAm))).toEqual(true);
    });

    it('should return true if date is equal to creation date', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: { ...defaultJiraJSONFields, created: nineAm },
      });
      expect(jira.existsOn(new Date(nineAm))).toEqual(true);
    });

    it('should return false if date is before creation date', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: { ...defaultJiraJSONFields, created: nineAm },
      });
      expect(jira.existsOn(new Date('2024-10-21T08:59:59.999Z'))).toEqual(
        false
      );
    });
  });

  describe('epic functions', () => {
    it('should return the epic start date if exists', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: { ...defaultJiraJSONFields, customfield_10015: '2024-10-23' },
      });
      expect(jira.getEpicStartDate()).toEqual(new Date('2024-10-23Z'));
    });

    it('should return null if no epic start date', () => {
      let jira = new Jira(defaultJiraJSON);
      expect(jira.getEpicStartDate()).toEqual(null);
    });

    it('should retrn the epic due date', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: { ...defaultJiraJSONFields, duedate: '2024-12-18' },
      });
      expect(jira.getEpicDueDate()).toEqual(new Date('2024-12-18'));
    });

    it('should return null if no epic due date', () => {
      let jira = new Jira(defaultJiraJSON);
      expect(jira.getEpicDueDate()).toEqual(null);
    });
  });
});
