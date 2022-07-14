import * as d3 from 'd3';

type Datum = {
  tempmin: number;
  tempmax: number;
  datetime: Date;
};
type Accessor = (d: Datum) => number;
type DateAccessor = (d: Datum) => Date;

(async () => {
  const parseDate = d3.timeParse('%Y-%d-%m');
  const formatNumber = d3.format('.1f');

  let data: Datum[] = [];
  try {
    data = await d3.csv('./data.csv', (d) => ({
      tempmin: +d.tempmin!,
      tempmax: +d.tempmax!,
      datetime: parseDate(d.datetime!)!,
    }));
  } catch (error) {
    console.error(error);
  }

  console.log(data);
})();
