import BambooRequester from "../../src/server/BambooRequester";
let fetchResponseOk = (body) => ({
  ok: true,
  json: () => Promise.resolve(body),
});

describe("BambooRequester", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, "fetch");
    jest.resetModules();
    process.env.BAMBOO_DOMAIN = "localhost:8080";
  });

  describe("getBuildsFromStartIndex", () => {
    it("request builds from server", async () => {
      let bambooRequester = new BambooRequester();
      fetchMock.mockResolvedValueOnce(
        fetchResponseOk({
          results: {
            result: [{ buildNumber: 1 }, { buildNumber: 2 }],
          },
        })
      );
      fetchMock.mockResolvedValueOnce(
        fetchResponseOk({
          buildSummary: {
            buildCompletedDate: "2021-01-01T00:00:00.000Z",
            state: "Successful",
          },
        })
      );
      fetchMock.mockResolvedValueOnce(
        fetchResponseOk({
          buildSummary: {
            buildCompletedDate: "2021-01-02T00:00:00.000Z",
            state: "Failed",
          },
        })
      );
      let response = await bambooRequester.getBuildsFromStartIndex("AA-BB", 0);
      expect(fetchMock.mock.calls[0][0]).toEqual(
        "localhost:8080/rest/api/latest/result/AA-BB.json?start-index=0"
      );
      // expect(response).toEqual({
      //   results: {
      //     result: [
      //       { key: 'AA-1', state: 'Successful', buildCompletedDate: '2021-01-01T00:00:00.000Z' },
      //       { key: 'AA-2', state: 'Failed', buildCompletedDate: '2021-01-02T00:00:00.000Z' },
      //     ],
      //   },
      // });
    });
  });

  describe("getBuild", () => {
    it("request build from server", async () => {
      let bambooRequester = new BambooRequester();
      fetchMock.mockResolvedValueOnce(
        fetchResponseOk({
          buildCompletedDate: "2021-01-02T00:00:00.000Z",
          state: "Failed",
          buildNumber: 1,
          buildDurationInSeconds: 600,
        })
      );
      let response = await bambooRequester.getBuild("AA-BB", 1);
      expect(fetchMock.mock.calls[0][0]).toEqual(
        "localhost:8080/rest/api/latest/result/AA-BB-1.json"
      );
      expect(response).toEqual({
        buildDate: "2021-01-02T00:00:00.000Z",
        buildState: "Failed",
        buildNumber: 1,
        restartCount: 0,
        buildDurationInMinutes: 10,
        allData: expect.any(Object),
      });
    });
  });

  describe("getLastXBuilds", () => {
    function mockResponse(state1 = "Successful", state2 = "Failed") {
      fetchMock.mockResolvedValueOnce(
        fetchResponseOk({
          results: {
            result: [{ buildNumber: 1 }, { buildNumber: 2 }],
          },
        })
      );
      fetchMock.mockResolvedValueOnce(
        fetchResponseOk({
          buildSummary: {
            buildCompletedDate: "2021-01-01T00:00:00.000Z",
            state: state1,
          },
        })
      );
      fetchMock.mockResolvedValueOnce(
        fetchResponseOk({
          buildSummary: {
            buildCompletedDate: "2021-01-02T00:00:00.000Z",
            state: state2,
          },
        })
      );
    }
    it("request 100 from server first time", async () => {
      let bambooRequester = new BambooRequester();
      mockResponse();
      mockResponse();
      mockResponse();
      mockResponse();
      let response = await bambooRequester.getLastXBuilds("AA-BB");
      expect(fetchMock).toHaveBeenCalledTimes(12);
      expect(fetchMock.mock.calls[0][0]).toEqual(
        "localhost:8080/rest/api/latest/result/AA-BB.json?start-index=0"
      );
      expect(fetchMock.mock.calls[3][0]).toEqual(
        "localhost:8080/rest/api/latest/result/AA-BB.json?start-index=25"
      );
      expect(fetchMock.mock.calls[6][0]).toEqual(
        "localhost:8080/rest/api/latest/result/AA-BB.json?start-index=50"
      );
      expect(fetchMock.mock.calls[9][0]).toEqual(
        "localhost:8080/rest/api/latest/result/AA-BB.json?start-index=75"
      );
      expect(response.length).toEqual(8); //because only returning 2, but should return 25;
    });

    describe("caching", () => {
      it("caches the results if requesting the same project on the same day", async () => {
        let bambooRequester = new BambooRequester();
        mockResponse();
        mockResponse();
        mockResponse();
        mockResponse();
        let response = await bambooRequester.getLastXBuilds("AA-BB");
        expect(fetchMock).toHaveBeenCalledTimes(12);

        let response2 = await bambooRequester.getLastXBuilds("AA-BB");
        expect(fetchMock).toHaveBeenCalledTimes(12);
        expect(response).toEqual(response2);
      });

      it("caches the results per projectBuildKey on the same day", async () => {
        let bambooRequester = new BambooRequester();
        mockResponse();
        mockResponse();
        mockResponse();
        mockResponse();
        mockResponse();
        mockResponse();
        mockResponse();
        mockResponse("Successful", "Successful");
        let response = await bambooRequester.getLastXBuilds("AA-BB");
        expect(fetchMock).toHaveBeenCalledTimes(12);

        let response2 = await bambooRequester.getLastXBuilds("AA-CC");
        expect(fetchMock).toHaveBeenCalledTimes(24);
        expect(response).not.toEqual(response2);
      });

      it("won't cache the results if requesting the same project on different days", async () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2021-01-01"));
        let bambooRequester = new BambooRequester();
        mockResponse();
        mockResponse();
        mockResponse();
        mockResponse();
        mockResponse();
        mockResponse();
        mockResponse();
        mockResponse("Successful", "Successful");
        let response = await bambooRequester.getLastXBuilds("AA-BB");
        expect(fetchMock).toHaveBeenCalledTimes(12);
        jest.setSystemTime(new Date("2021-01-02"));

        let response2 = await bambooRequester.getLastXBuilds("AA-BB");
        expect(fetchMock).toHaveBeenCalledTimes(24);
        expect(response).not.toEqual(response2);
      });
    });
  });
});
