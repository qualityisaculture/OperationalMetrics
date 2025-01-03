export function inWorkDay(date: Date): boolean {
  if (date.getDay() == 6 || date.getDay() == 0) {
    return false;
  }
  if (date.getUTCHours() < 9) {
    return false;
  }
  if (date.getUTCHours() >= 17) {
    return false;
  }
  return true;
}

//Not accurate to the minute, but good enough for this use case
export function getWorkDaysBetween(date1: Date, date2: Date): number {
  if (date2.getTime() - date1.getTime() < 60 * 60 * 1000) {
    return 0;
  }
  let workHours = 0;
  let currentDate = new Date(date1);
  while (currentDate < date2) {
    if (inWorkDay(currentDate)) {
      workHours++;
    }
    currentDate.setUTCHours(currentDate.getUTCHours() + 1);
  }
  return workHours / 8;
}
