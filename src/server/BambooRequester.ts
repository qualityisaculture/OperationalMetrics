type BambooAPIBuild = {
  buildNumber: number;
  buildResultKey: string;
  buildState: string;
};
type BambooAPIBuilds = {
  results: {
    result: BambooAPIBuild[];
  };
};
type BambooAPIDetailBuild = {
  buildNumber: number;
  buildCompletedDate: string;
  buildDurationInSeconds: number;
  buildDurationDescription: string;
  restartCount?: number;
  state: string;
};
export type BambooBuildData = {
  buildNumber: number;
  buildState: string;
  buildDate: string;
  buildDurationInMinutes: number;
  restartCount: number;
  allData: BambooAPIDetailBuild;
};
export default class BambooRequester {
  cache: { [key: string]: BambooBuildData[] };
  cacheDate: string;
  constructor() {
    this.cache = {};
    this.cacheDate = "";
  }

  async getBuildsFromStartIndex(projectBuildKey: string, startIndex: number) {
    const domain = process.env.BAMBOO_DOMAIN;
    const url = `${domain}/rest/api/latest/result/${projectBuildKey}.json?start-index=${startIndex}`;
    let results: BambooAPIBuilds = await this.fetchRequest(url);
    let buildNumbers = results.results.result.map((build) => build.buildNumber);
    let allBuilds = await Promise.all(
      buildNumbers.map((buildNumber) =>
        this.getBuild(projectBuildKey, buildNumber)
      )
    );
    return allBuilds;
  }

  async getBuild(
    buildResultKey: string,
    buildNumber: number
  ): Promise<BambooBuildData> {
    const domain = process.env.BAMBOO_DOMAIN;
    const url = `${domain}/rest/api/latest/result/${buildResultKey}-${buildNumber}.json`;
    let buildData: BambooAPIDetailBuild = await this.fetchRequest(url);
    let returnData: BambooBuildData = {
      buildNumber: buildData.buildNumber,
      buildState: buildData.state,
      buildDate: buildData.buildCompletedDate,
      buildDurationInMinutes: buildData.buildDurationInSeconds / 60,
      restartCount: buildData.restartCount || 0,
      allData: buildData,
    };
    return returnData;
  }

  async getLastXBuilds(
    projectBuildKey: string,
    numberOfBuilds: number = 100
  ): Promise<BambooBuildData[]> {
    let cacheDate = new Date().toISOString().split("T")[0];
    if (this.cache[projectBuildKey] && this.cacheDate === cacheDate) {
      return this.cache[projectBuildKey];
    }
    let builds: BambooBuildData[] = [];
    let startIndex = 0;
    while (startIndex < numberOfBuilds) {
      let response = await this.getBuildsFromStartIndex(
        projectBuildKey,
        startIndex
      );
      builds = builds.concat(response);
      startIndex += 25;
    }
    this.cache[projectBuildKey] = builds;
    this.cacheDate = cacheDate;
    return builds;
  }

  async fetchRequest(url: string) {
    const apiToken = process.env.BAMBOO_API_TOKEN;
    const response = await fetch(url, {
      method: "GET", // or 'POST', 'PUT', etc. depending on your request
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(
        "Failed to fetch  data: " + url + " " + response.statusText
      );
    }
    return response.json();
  }
}
