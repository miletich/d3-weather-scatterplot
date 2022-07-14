import * as d3 from 'd3';

type Datum = {
  tempmin: number;
  tempmax: number;
  datetime: Date;
};
type Accessor = (d: Datum) => number;

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

  // canvas
  const size = d3.min([window.innerWidth * 0.75, window.innerHeight * 0.75])!;
  const containerWidth = size;
  const containerHeight = size;
  const margin = {
    top: 90,
    right: 90,
    bottom: 50,
    left: 50,
  };
  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;

  const wrapper = d3
    .select('#app')
    .attr('width', containerWidth)
    .attr('right', containerHeight);

  const bounds = wrapper
    .append('g')
    .attr('class', 'bounds')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // accessors
  const xAccessor: Accessor = (d) => d.tempmax;
  const yAccessor: Accessor = (d) => d.tempmin;
  // data might span multiple years but we are only interested in the time
  // of the year, not the absolute date, so we're normalizing years in this way
  const colorScaleYear = 2000;
  const colorAccessor: Accessor = (d) => d.datetime.setFullYear(colorScaleYear);
})();
