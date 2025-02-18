import BambooRequester, { BambooBuildData } from "../BambooRequester";

export type BuildInfo = {
  month: string;
  builds: BambooBuildData[];
  averageBuildTime: number;
  totalBuilds: number;
  passBuilds: number;
  restartedBuilds: number;
  passFirstTimeBuilds: number;
  successRate: number;
  failureRate: number;
  restartRate: number;
  passFirstTimeRate: number;
};

export default class BambooGraphManager {
  bambooRequester: BambooRequester;
  constructor(bambooRequester: BambooRequester) {
    this.bambooRequester = bambooRequester;
  }

  weekOfYear(date: Date) {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    startOfYear.setDate(startOfYear.getDate() + (startOfYear.getDay() % 7));
    //@ts-ignore
    return Math.round((date - startOfYear) / 604_800_000);
  }

  async getBuildDataByWeek(projectBuildKey: string): Promise<BuildInfo[]> {
    let builds = await this.bambooRequester.getLastXBuilds(
      projectBuildKey,
      200
    );
    let buildsByMonthAndYear = builds.reduce((acc, build) => {
      let date = new Date(build.buildDate);
      // let month = ('0' + (date.getMonth() + 1)).slice(-2);
      let year = date.getFullYear();
      let week = this.weekOfYear(date);
      let key = `${year}-${week}`;
      if (acc[key]) {
        acc[key].push(build);
      } else {
        acc[key] = [build];
      }
      return acc;
    }, {});

    let arrayOfBuildsByMonth: BuildInfo[] = Object.keys(
      buildsByMonthAndYear
    ).map((key) => {
      return {
        month: key,
        builds: buildsByMonthAndYear[key],
        totalBuilds: 0,
        passBuilds: 0,
        restartedBuilds: 0,
        passFirstTimeBuilds: 0,
        successRate: 0,
        failureRate: 0,
        restartRate: 0,
        passFirstTimeRate: 0,
        averageBuildTime: 0,
      };
    });

    arrayOfBuildsByMonth.forEach((buildsByMonth) => {
      let successfulBuilds = buildsByMonth.builds.filter(
        (build) => build.buildState === "Successful"
      );
      let failedBuilds = buildsByMonth.builds.filter(
        (build) => build.buildState === "Failed"
      );
      let restartedBuilds = buildsByMonth.builds.filter(
        (build) => build.restartCount > 0
      );
      let buildsPassedFirstTime = buildsByMonth.builds.filter(
        (build) => build.restartCount === 0 && build.buildState === "Successful"
      );
      let totalBuilds = successfulBuilds.length + failedBuilds.length;
      let successRate =
        totalBuilds === 0 ? 0 : successfulBuilds.length / totalBuilds;
      buildsByMonth.totalBuilds = totalBuilds;
      buildsByMonth.averageBuildTime =
        buildsByMonth.builds.reduce(
          (acc, build) => acc + build.buildDurationInMinutes,
          0
        ) / buildsByMonth.builds.length;
      buildsByMonth.passBuilds = successfulBuilds.length;
      buildsByMonth.restartedBuilds = restartedBuilds.length;
      buildsByMonth.passFirstTimeBuilds = buildsPassedFirstTime.length;
      buildsByMonth.successRate = successRate;
      buildsByMonth.failureRate = 1 - successRate;
      buildsByMonth.restartRate =
        totalBuilds === 0 ? 0 : restartedBuilds.length / totalBuilds;
      buildsByMonth.passFirstTimeRate =
        totalBuilds === 0 ? 0 : buildsPassedFirstTime.length / totalBuilds;
    });

    arrayOfBuildsByMonth.sort((a, b) => {
      return a.month.localeCompare(b.month);
    });

    return arrayOfBuildsByMonth;
  }
}
