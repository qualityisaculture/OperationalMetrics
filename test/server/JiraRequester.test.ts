import JiraRequester from "../../src/server/JiraRequester";

//mock fetch

let fetchResponseOk = (body) => ({
  ok: true,
  json: () => Promise.resolve(body),
});

describe("JiraRequester", () => {
  let fetchMock;
  let jr;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, "fetch");
    jest.resetModules();
    process.env.JIRA_DOMAIN = "localhost:8080";
    jr = new JiraRequester();
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  let defaultResponse = fetchResponseOk({
    issues: [
      {
        key: "KEY-1",
        fields: {
          created: "2024-10-21T09:00:00.000+0100",
          status: { name: "Backlog" },
          updated: "2024-10-21T09:00:00.000+0100",
        },
      },
    ],
  });

  describe("getFullJiraDataFromKeys", () => {
    it("should request jira from server with changelog expanded", async () => {
      fetchMock.mockResolvedValue(defaultResponse);
      let jira = await jr.getFullJiraDataFromKeys([{ key: "KEY-1" }]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toEqual(
        "localhost:8080/rest/api/3/search?jql=key=KEY-1&expand=changelog"
      );
    });

    it("should not request jira from server a second time if updated is the same", async () => {
      fetchMock.mockResolvedValue(defaultResponse);
      expect(fetchMock).toHaveBeenCalledTimes(0);
      let jira = await jr.getFullJiraDataFromKeys([
        { key: "KEY-1", updated: "2024-10-21T09:00:00.000+0100" },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(jira[0].getKey()).toEqual("KEY-1");
      let jira2 = await jr.getFullJiraDataFromKeys([
        { key: "KEY-1", updated: "2024-10-21T09:00:00.000+0100" },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(jira2[0].getKey()).toEqual("KEY-1");
    });

    it("should request jira from server if updated is different", async () => {
      fetchMock.mockResolvedValueOnce(defaultResponse);
      let jira = await jr.getFullJiraDataFromKeys([{ key: "KEY-1" }]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(jira[0].getKey()).toEqual("KEY-1");
      fetchMock.mockResolvedValueOnce(
        fetchResponseOk({
          issues: [
            {
              key: "KEY-1",
              fields: {
                created: "2024-10-21T09:00:00.000+0100",
                status: { name: "Backlog" },
                updated: "2024-10-21T09:00:01.000+0100",
              },
            },
          ],
        })
      );
      let jira2 = await jr.getFullJiraDataFromKeys([{ key: "KEY-1" }]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(jira2[0].getKey()).toEqual("KEY-1");
    });

    it("should not return anything in the cache if empty array is passed", async () => {
      fetchMock.mockResolvedValue(defaultResponse);
      let jira = await jr.getFullJiraDataFromKeys([{ key: "KEY-1" }]);
      expect(jira[0].getKey()).toEqual("KEY-1");
      let jira2 = await jr.getFullJiraDataFromKeys([]);
      expect(jira2.length).toEqual(0);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("should be able to request multiple jiras", async () => {
      fetchMock.mockResolvedValue(
        fetchResponseOk({
          issues: [
            {
              key: "KEY-1",
              fields: {
                created: "2024-10-21T09:00:00.000+0100",
                status: { name: "Backlog" },
              },
            },
            {
              key: "KEY-2",
              fields: {
                created: "2024-10-21T09:00:00.000+0100",
                status: { name: "Backlog" },
              },
            },
          ],
        })
      );
      let jiras = await jr.getFullJiraDataFromKeys([
        { key: "KEY-1" },
        { key: "KEY-2" },
      ]);
      expect(fetchMock.mock.calls[0][0]).toEqual(
        "localhost:8080/rest/api/3/search?jql=key=KEY-1 OR key=KEY-2&expand=changelog"
      );
    });
  });

  describe("request query from server", () => {
    beforeEach(() => {
      fetchMock.mockResolvedValue(
        fetchResponseOk({
          issues: [
            {
              key: "KEY-1",
              fields: {
                created: "2024-10-21T09:00:00.000+0100",
                status: { name: "Backlog" },
              },
            },
          ],
          maxResults: 50,
          startAt: 0,
          total: 0,
        })
      );
    });
    it("should request a query from server for just the keys", async () => {
      let jr = new JiraRequester();
      let jiras = await jr.getQuery('project="Project 1" AND resolved >= -1w');
      expect(fetchMock.mock.calls[0][0]).toEqual(
        'localhost:8080/rest/api/3/search?jql=project="Project 1" AND resolved >= -1w&fields=key,updated'
      );
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(jiras[0].getKey()).toEqual("KEY-1");
    });

    it("should request the jira from the server for each key", async () => {
      let jr = new JiraRequester();
      let jiras = await jr.getQuery('project="Project 1" AND resolved >= -1w');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1][0]).toEqual(
        "localhost:8080/rest/api/3/search?jql=key=KEY-1&expand=changelog"
      );
    });

    it("should map issues to Jira objects", async () => {
      fetchMock.mockResolvedValueOnce(
        fetchResponseOk({
          issues: [
            {
              key: "KEY-1",
              fields: {
                updated: "2024-10-21T09:00:00.000+0100",
              },
            },
            {
              key: "KEY-2",
              fields: {
                updated: "2024-10-21T09:00:00.000+0100",
              },
            },
          ],
          maxResults: 50,
          startAt: 0,
          total: 0,
        })
      );
      fetchMock.mockResolvedValueOnce(
        fetchResponseOk({
          issues: [
            {
              key: "KEY-1",
              fields: {
                created: "2024-10-21T09:00:00.000+0100",
                status: { name: "Backlog" },
              },
            },
            {
              key: "KEY-2",
              fields: {
                created: "2024-10-21T09:00:00.000+0100",
                status: { name: "Backlog" },
              },
            },
          ],
        })
      );
      let jr = new JiraRequester();
      let jiras = await jr.getQuery('project="Project 1" AND resolved >= -1w');
      expect(jiras[0].getKey()).toEqual("KEY-1");
      expect(jiras[1].getKey()).toEqual("KEY-2");
    });
  });

  describe("getJiraKeysInQuery", () => {
    let defaultResponse = fetchResponseOk({
      issues: [
        {
          key: "KEY-1",
          fields: {
            updated: "2024-10-21T09:00:00.000+0100",
          },
        },
      ],
      maxResults: 50,
      startAt: 0,
      total: 0,
    });
    beforeEach(() => {});
    it("should request the keys and updated of the query", async () => {
      fetchMock.mockResolvedValue(defaultResponse);
      let jr = new JiraRequester();
      let jiras = await jr.getJiraKeysInQuery(
        'project="Project 1" AND resolved >= -1w'
      );
      expect(fetchMock.mock.calls[0][0]).toEqual(
        'localhost:8080/rest/api/3/search?jql=project="Project 1" AND resolved >= -1w&fields=key,updated'
      );
      expect(jiras).toEqual([
        { key: "KEY-1", updated: "2024-10-21T09:00:00.000+0100" },
      ]);
    });
    it("should return the key and updated fields", async () => {
      fetchMock.mockResolvedValueOnce(defaultResponse);
      let jr = new JiraRequester();
      let jiras = await jr.getJiraKeysInQuery(
        'project="Project 1" AND resolved >= -1w'
      );
      expect(jiras).toEqual([
        { key: "KEY-1", updated: "2024-10-21T09:00:00.000+0100" },
      ]);
    });
    it("should return an error if more than 5000 issues are returned", async () => {
      fetchMock.mockResolvedValue(
        fetchResponseOk({
          issues: [],
          maxResults: 5001,
          startAt: 0,
          total: 5001,
        })
      );
      let jr = new JiraRequester();
      await expect(
        jr.getJiraKeysInQuery('project="Project 1" AND resolved >= -1w')
      ).rejects.toThrow("Query returned too many results");
    });

    it("should request multiple pages if more than 50 issues are returned", async () => {
      fetchMock.mockResolvedValueOnce(
        fetchResponseOk({
          issues: [
            {
              key: "KEY-1",
              fields: {
                updated: "2024-10-21T09:00:00.000+0100",
              },
            },
          ],
          maxResults: 50,
          startAt: 0,
          total: 100,
        })
      );
      fetchMock.mockResolvedValueOnce(
        fetchResponseOk({
          issues: [
            {
              key: "KEY-2",
              fields: {
                updated: "2024-10-21T09:00:00.000+0100",
              },
            },
          ],
          maxResults: 50,
          startAt: 50,
          total: 100,
        })
      );
      let jr = new JiraRequester();
      let jiras = await jr.getJiraKeysInQuery(
        'project="Project 1" AND resolved >= -1w'
      );
      expect(jiras.map((jira) => jira.key)).toEqual(["KEY-1", "KEY-2"]);
    });
  });

  describe("getJiraWithInitiative", () => {
    let subReponse = fetchResponseOk({
      issues: [
        {
          key: "SUB-1",
          fields: {
            created: "2024-10-21T09:00:00.000+0100",
            status: { name: "Backlog" },
            parent: {
              key: "KEY-1",
              fields: {
                issuetype: { name: "Task" },
                summary: "Epic Summary",
              },
            },
          },
        },
      ],
    });
    let taskResponse = fetchResponseOk({
      issues: [
        {
          key: "KEY-1",
          fields: {
            created: "2024-10-21T09:00:00.000+0100",
            status: { name: "Backlog" },
            parent: {
              key: "EPIC-1",
              fields: {
                issuetype: { name: "Epic" },
                summary: "Epic SUmmary",
              },
            },
          },
        },
      ],
    });
    let epicResponse = fetchResponseOk({
      issues: [
        {
          key: "EPIC-1",
          fields: {
            created: "2024-10-21T09:00:00.000+0100",
            status: { name: "Backlog" },
            parent: {
              key: "INITIATIVE-1",
              fields: {
                issuetype: { name: "Initiative" },
                summary: "Initiative Summary",
              },
            },
          },
        },
      ],
    });
    it("should return the jira with the initiative when tasks", async () => {
      let jr = new JiraRequester();
      fetchMock.mockResolvedValueOnce(taskResponse);
      fetchMock.mockResolvedValueOnce(epicResponse);
      let jiras = await jr.getFullJiraDataFromKeys([{ key: "KEY-1" }]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(jiras[0].fields.initiativeKey).toEqual("INITIATIVE-1");
    });

    it("should return the jira with the initiative when sub-tasks", async () => {
      let jr = new JiraRequester();
      fetchMock.mockResolvedValueOnce(subReponse);
      fetchMock.mockResolvedValueOnce(taskResponse);
      fetchMock.mockResolvedValueOnce(epicResponse);
      let jiras = await jr.getFullJiraDataFromKeys([{ key: "SUB-1" }]);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(jiras[0].fields.initiativeKey).toEqual("INITIATIVE-1");
    });
  });

  describe("requestIssueFromServer", () => {
    it("should return an empty array if no keys are passed", async () => {
      let jr = new JiraRequester();
      jr.requestDataFromServer = jest.fn();
      let jiras = await jr.requestIssueFromServer([]);
      expect(jiras.issues).toEqual([]);
      expect(jr.requestDataFromServer).not.toHaveBeenCalled();
      jr.requestDataFromServer;
    });
    it("should be able to request just a single key", async () => {
      let jr = new JiraRequester();
      jr.requestDataFromServer = jest.fn().mockResolvedValue({
        issues: [
          {
            key: "KEY-1",
            fields: {
              created: "2024-10-21T09:00:00.000+0100",
              status: { name: "Backlog" },
            },
          },
        ],
      });
      let jiras = await jr.requestIssueFromServer(["KEY-1"]);
      expect(jiras.issues[0].key).toEqual("KEY-1");
      expect(jr.requestDataFromServer).toHaveBeenCalledWith(
        "key=KEY-1&expand=changelog"
      );
    });

    it("should be able to request multiple keys", async () => {
      let jr = new JiraRequester();
      jr.requestDataFromServer = jest.fn().mockResolvedValue({
        issues: [
          {
            key: "KEY-1",
            fields: {
              created: "2024-10-21T09:00:00.000+0100",
              status: { name: "Backlog" },
            },
          },
          {
            key: "KEY-2",
            fields: {
              created: "2024-10-21T09:00:00.000+0100",
              status: { name: "Backlog" },
            },
          },
        ],
      });
      let jiras = await jr.requestIssueFromServer(["KEY-1", "KEY-2"]);
      expect(jiras.issues[0].key).toEqual("KEY-1");
      expect(jiras.issues[1].key).toEqual("KEY-2");
      expect(jr.requestDataFromServer).toHaveBeenCalledWith(
        "key=KEY-1 OR key=KEY-2&expand=changelog"
      );
    });

    it("should request keys in batches of 50 and concatenate the results", async () => {
      let jr = new JiraRequester();
      jr.requestDataFromServer = jest
        .fn()
        .mockResolvedValueOnce({
          issues: [
            {
              key: "KEY-1",
              fields: {
                created: "2024-10-21T09:00:00.000+0100",
                status: { name: "Backlog" },
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          issues: [
            {
              key: "KEY-51",
              fields: {
                created: "2024-10-21T09:00:00.000+0100",
                status: { name: "Backlog" },
              },
            },
          ],
        });
      let keysArray: string[] = [];
      for (let i = 1; i <= 100; i++) {
        keysArray.push(`KEY-${i}`);
      }
      let jiras = await jr.requestIssueFromServer(keysArray);
      expect(jr.requestDataFromServer).toHaveBeenCalledTimes(2);
      expect(jr.requestDataFromServer).toHaveBeenCalledWith(
        "key=KEY-1 OR key=KEY-2 OR key=KEY-3 OR key=KEY-4 OR key=KEY-5 OR key=KEY-6 OR key=KEY-7 OR key=KEY-8 OR key=KEY-9 OR key=KEY-10 OR key=KEY-11 OR key=KEY-12 OR key=KEY-13 OR key=KEY-14 OR key=KEY-15 OR key=KEY-16 OR key=KEY-17 OR key=KEY-18 OR key=KEY-19 OR key=KEY-20 OR key=KEY-21 OR key=KEY-22 OR key=KEY-23 OR key=KEY-24 OR key=KEY-25 OR key=KEY-26 OR key=KEY-27 OR key=KEY-28 OR key=KEY-29 OR key=KEY-30 OR key=KEY-31 OR key=KEY-32 OR key=KEY-33 OR key=KEY-34 OR key=KEY-35 OR key=KEY-36 OR key=KEY-37 OR key=KEY-38 OR key=KEY-39 OR key=KEY-40 OR key=KEY-41 OR key=KEY-42 OR key=KEY-43 OR key=KEY-44 OR key=KEY-45 OR key=KEY-46 OR key=KEY-47 OR key=KEY-48 OR key=KEY-49 OR key=KEY-50&expand=changelog"
      );
      expect(jr.requestDataFromServer).toHaveBeenCalledWith(
        "key=KEY-51 OR key=KEY-52 OR key=KEY-53 OR key=KEY-54 OR key=KEY-55 OR key=KEY-56 OR key=KEY-57 OR key=KEY-58 OR key=KEY-59 OR key=KEY-60 OR key=KEY-61 OR key=KEY-62 OR key=KEY-63 OR key=KEY-64 OR key=KEY-65 OR key=KEY-66 OR key=KEY-67 OR key=KEY-68 OR key=KEY-69 OR key=KEY-70 OR key=KEY-71 OR key=KEY-72 OR key=KEY-73 OR key=KEY-74 OR key=KEY-75 OR key=KEY-76 OR key=KEY-77 OR key=KEY-78 OR key=KEY-79 OR key=KEY-80 OR key=KEY-81 OR key=KEY-82 OR key=KEY-83 OR key=KEY-84 OR key=KEY-85 OR key=KEY-86 OR key=KEY-87 OR key=KEY-88 OR key=KEY-89 OR key=KEY-90 OR key=KEY-91 OR key=KEY-92 OR key=KEY-93 OR key=KEY-94 OR key=KEY-95 OR key=KEY-96 OR key=KEY-97 OR key=KEY-98 OR key=KEY-99 OR key=KEY-100&expand=changelog"
      );
    });
  });
});
