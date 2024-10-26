import Jira from '../../src/server/Jira';

let nineAm = "2024-10-21T09:00:00.000Z";
let nineThirtyAm = "2024-10-21T09:30:00.000Z";
let tenAm = "2024-10-21T10:00:00.000Z";
export const defaultJiraJSONFields = { created: nineAm,  status: { name: 'Backlog' } };
export const defaultJiraJSON = { key: 'KEY-1', fields: defaultJiraJSONFields };

describe('Jira', () => {
  it('should return the key', () => {
    let jira = new Jira({ ...defaultJiraJSON, key: 'KEY-2' });
    expect(jira.getKey()).toEqual('KEY-2');
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
              items: [{ field: 'Epic Child', fromString: null, toString: 'KEY-1' }],
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
                { field: 'Other Field', fromString: null, toString: 'Other Field' },
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
              items: [{ field: 'Epic Child', fromString: null, toString: 'KEY-1' }],
            },
            {
              items: [{ field: 'Epic Child', fromString: null, toString: 'KEY-2' }],
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
              created: "2024-10-22T09:46:38.582+0100",
              items: [{ field: 'Epic Child', fromString: 'KEY-1', toString: null }],
            },
            {
              created: "2024-10-20T09:49:29.143+0100",
              items: [{ field: 'Epic Child', fromString: null, toString: 'KEY-1' }],
            }
          ],
        },
      });
      expect(jira.getChildrenKeys()).toEqual([]);
    });
  });

  describe('getStatus', () => {
    it('should return the current state when no date passed', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: {...defaultJiraJSONFields, status: { name: 'In Progress' }},
      });
      expect(jira.getStatus()).toEqual('In Progress');
    });

    it('should return null if passed date prior to Jira creation', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: {...defaultJiraJSONFields, created: "2024-10-21T09:46:38.582+0100",},
      });
      expect(jira.getStatus(new Date("2024-10-20T09:46:38.582+0100"))).toEqual(null);
    });

    it('should return the starting state if date is prior to first state change', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        changelog: {
          histories: [
            {
              created: tenAm,
              items: [{ field: 'status', fromString: 'Backlog', toString: 'In Progress' }],
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
              items: [{ field: 'status', fromString: 'Todo', toString: 'In Progress' }],
            }
          ],
        },
      });
      expect(jira2.getStatus(new Date(nineThirtyAm))).toEqual('Todo');
    })

    it('should return the state of the last change before the date', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        changelog: {
          histories: [
            {
              created: nineThirtyAm,
              items: [{ field: 'status', fromString: 'Backlog', toString: 'In Progress' }],
            },
            {
              created: tenAm,
              items: [{ field: 'status', fromString: 'In Progress', toString: 'Done' }],
            },
          ],
        },
      });
      expect(jira.getStatus(new Date(nineThirtyAm))).toEqual('In Progress');
      expect(jira.getStatus(new Date(tenAm))).toEqual('Done');
    });
  })

  describe('isDone', () => {
    it('should return true if status is Done', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: {...defaultJiraJSONFields, status: { name: 'Done' }},
      });
      expect(jira.isDone()).toEqual(true);
    });

    it('should return false if status is not Done', () => {
      let jira = new Jira({
        ...defaultJiraJSON,
        fields: {...defaultJiraJSONFields, status: { name: 'In Progress' }},
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
              items: [{ field: 'status', fromString: 'Backlog', toString: 'In Progress' }],
            },
            {
              created: tenAm,
              items: [{ field: 'status', fromString: 'In Progress', toString: 'Done' }],
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
          fields: {...defaultJiraJSONFields, status: { name: 'Done' }},
        });
        expect(jira.isInScope()).toEqual(true);
      });

      it('should return false if status is Cancelled', () => {
        let jira = new Jira({
          ...defaultJiraJSON,
          fields: {...defaultJiraJSONFields, status: { name: 'Cancelled' }},
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
                items: [{ field: 'status', fromString: 'Backlog', toString: 'In Progress' }],
              },
              {
                created: tenAm,
                items: [{ field: 'status', fromString: 'In Progress', toString: 'Cancelled' }],
              },
            ],
          },
        });
        expect(jira.isInScope(new Date(nineThirtyAm))).toEqual(true);
        expect(jira.isInScope(new Date(tenAm))).toEqual(false);
      });
    });
  });
  
});
