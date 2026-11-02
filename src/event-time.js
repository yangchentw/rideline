const HOUR=60*60*1000;
export const EVENT_START_ERROR='出發日期與時間必須晚於現在 8 小時，請重新選擇（台灣時間）。';

export function taiwanDateTimeInput(now=Date.now()) {
  return new Date(now+8*HOUR).toISOString().slice(0,16);
}

export function earliestEventStartInput(now=Date.now()) {
  // datetime-local uses minute precision; the boundary itself is not allowed.
  return taiwanDateTimeInput(Math.floor((now+8*HOUR)/60000)*60000+60000);
}

export function validateEventStart(startsAt,now=Date.now()) {
  if(typeof startsAt!=='string'||!Number.isFinite(Date.parse(startsAt))||Date.parse(startsAt)<=now+8*HOUR) {
    throw new Error(EVENT_START_ERROR);
  }
}
