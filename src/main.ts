import './style.css';
import * as d3 from 'd3';
import { Bin } from 'd3';

type Datum = {
  tempmin: number;
  tempmax: number;
  datetime: Date;
};
type Accessor = (d: Datum) => number;

(async () => {
  const parseDate = d3.timeParse('%Y-%m-%d');
  const formatNumber = d3.format('.1f');
  const formatDate = d3.timeFormat('%d %B');

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
  const histogramMargin = 10;
  const histogramHeight = 70;
  const legendWidth = 250;
  const legendHeight = 26;

  const wrapper = d3
    .select('#app')
    .append('svg')
    .attr('width', containerWidth)
    .attr('height', containerHeight);

  const bounds = wrapper
    .append('g')
    .attr('class', 'bounds')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const defs = wrapper.append('defs');

  bounds
    .append('rect')
    .attr('class', 'bounds-background')
    .attr('x', 0)
    .attr('y', 0)
    .attr('fill', 'white')
    .attr('width', width)
    .attr('height', height);

  const tooltip = d3.select('#tooltip');

  // accessors
  const xAccessor: Accessor = (d) => d.tempmin;
  const yAccessor: Accessor = (d) => d.tempmax;
  // data might span multiple years but we are only interested in the time
  // of the year, not the absolute date, so we're normalizing years in this way
  const colorScaleYear = 2000;
  const colorAccessor: Accessor = (d) => d.datetime.setFullYear(colorScaleYear);

  // scales
  const temperaturesExtent = <[number, number]>(
    d3.extent([...data.map(xAccessor), ...data.map(yAccessor)])!
  );
  const xScale = d3
    .scaleLinear()
    .domain(temperaturesExtent)
    .range([0, width])
    .nice();
  const yScale = d3
    .scaleLinear()
    .domain(temperaturesExtent)
    .range([height, 0])
    .nice();
  const colorScale = d3
    .scaleSequential()
    .domain([
      parseDate(`${colorScaleYear}-01-01`)!,
      parseDate(`${colorScaleYear}-12-31`)!,
    ])
    // otherwise, autumn dates would be gree and spring dates orange
    // this way we improve the semantics of the colors
    .interpolator((d) => d3.interpolateRainbow(-d));

  // axes
  const generateXAxis = d3.axisBottom(xScale).ticks(4);
  const generateYAxis = d3.axisLeft(yScale).ticks(4);

  const xAxis = bounds
    .append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(generateXAxis);

  xAxis
    .append('text')
    .attr('class', 'x-axis-label')
    .attr('text-anchor', 'middle')
    .attr('x', width / 2)
    .attr('y', 45)
    .text('Minimum Temperature °C');

  const yAxis = bounds.append('g').call(generateYAxis);

  yAxis
    .append('text')
    .attr('class', 'y-axis-label')
    .attr('text-anchor', 'middle')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -40)
    .text('Maximum Temperature °C');

  // scatter plot
  const scatterPlot = bounds.append('g').attr('class', 'scatter-plot');

  const dots = scatterPlot
    .selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', (d) => xScale(xAccessor(d)))
    .attr('cy', (d) => yScale(yAccessor(d)))
    .attr('r', 4)
    .attr('fill', (d) => colorScale(colorAccessor(d)));

  // voronoi
  const delaunay = d3.Delaunay.from(
    data,
    (d) => xScale(xAccessor(d)),
    (d) => yScale(yAccessor(d))
  );
  const voronoi = delaunay.voronoi();
  voronoi.xmax = width;
  voronoi.ymax = height;

  const voronoiCells = bounds
    .append('g')
    .selectAll('.voronoi')
    .data(data)
    .enter()
    .append('path')
    .attr('class', 'voronoi')
    .attr('d', (_, i) => voronoi.renderCell(i))
    .attr('fill', 'transparent');

  // legend
  const legendGroup = bounds
    .append('g')
    .attr('class', 'legend-group')
    .attr(
      'transform',
      `translate(${width - legendWidth - 9}, ${height - legendHeight - 9})`
    );

  const numberOfGradientStops = 10;
  const stops = d3
    .range(numberOfGradientStops)
    .map((i) => i / (numberOfGradientStops - 1));

  const legendGradientId = 'legend-gradient';
  const gradient = defs
    .append('linearGradient')
    .attr('id', legendGradientId)
    .selectAll('stop')
    .data(stops)
    .enter()
    .append('stop')
    .attr('offset', (d) => `${d * 100}%`)
    .attr('stop-color', (d) => d3.interpolateRainbow(-d));

  const legendGradient = legendGroup
    .append('rect')
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .attr('fill', `url(#${legendGradientId})`);

  const ticks = [
    parseDate(`${colorScaleYear}-4-1`)!,
    parseDate(`${colorScaleYear}-7-1`)!,
    parseDate(`${colorScaleYear}-10-1`)!,
  ];

  const legendTickScale = d3
    .scaleLinear()
    .domain(colorScale.domain())
    .range([0, legendWidth]);

  const legendValues = legendGroup
    .selectAll('.legend-value')
    .data(ticks)
    .enter()
    .append('text')
    .attr('class', 'legend-value')
    .attr('x', legendTickScale)
    .attr('y', -6)
    .text((d) => d3.timeFormat('%b')(d));

  const legendValueTicks = legendGroup
    .selectAll('.legend-tick')
    .data(ticks)
    .enter()
    .append('line')
    .attr('class', 'legend-tick')
    .attr('x1', legendTickScale)
    .attr('x2', legendTickScale)
    .attr('y2', 6);

  // legend interactions
  const legendHighlightBarWidth = legendWidth * 0.05;
  const legendHighlightGroup = legendGroup.append('g').attr('opacity', 0);

  const legendHighlightBar = legendHighlightGroup
    .append('rect')
    .attr('class', 'legend-highlight-bar')
    .attr('width', legendHighlightBarWidth)
    .attr('height', legendHeight)
    .style('pointer-events', 'none');

  const legendHighlightText = legendHighlightGroup
    .append('text')
    .attr('class', 'legend-highligh-text')
    .attr('text-anchor', 'middle')
    .attr('x', legendWidth / 2)
    .attr('y', -6);

  type LegendEvtHandler = (e: MouseEvent) => void;
  const onLegendMouseMove: LegendEvtHandler = (e) => {
    const [x] = d3.pointer(e);

    const minDateToHighlight = new Date(
      legendTickScale.invert(x - legendHighlightBarWidth / 2)
    );
    const maxDateToHighlight = new Date(
      legendTickScale.invert(x + legendHighlightBarWidth / 2)
    );

    // makes sure x remains within the bounds of the legend
    const barX = d3.median([
      // if less than 0, it returns 0
      0,
      x - legendHighlightBarWidth / 2,
      // if more than this, it returns this
      legendWidth - legendHighlightBarWidth,
    ])!;

    legendHighlightGroup.style('opacity', 1);
    legendValueTicks.attr('opacity', 0);
    legendValues.attr('opacity', 0);

    legendHighlightBar.attr('x', barX);

    const formatLegendDate = d3.timeFormat('%d %b');
    legendHighlightText.text(
      [
        formatLegendDate(minDateToHighlight),
        formatLegendDate(maxDateToHighlight),
      ].join(' - ')
    );
  };

  const onLegendMouseLeave: LegendEvtHandler = (e) => {
    legendHighlightGroup.style('opacity', 0);
    legendValueTicks.attr('opacity', 1);
    legendValues.attr('opacity', 1);
  };

  legendGradient
    .on('mousemove', onLegendMouseMove)
    .on('mouseleave', onLegendMouseLeave);

  // histograms
  const generateTopHistogram = d3
    .bin<Datum, number>()
    .domain(<[number, number]>xScale.domain())
    .value(xAccessor)
    .thresholds(20);

  const generateRightHistogram = d3
    .bin<Datum, number>()
    .domain(<[number, number]>yScale.domain())
    .value(yAccessor)
    .thresholds(20);

  const topHistogramBins = generateTopHistogram(data);
  const rightHistogramBins = generateRightHistogram(data);

  const topHistogramYScale = d3
    .scaleLinear()
    .domain(<[number, number]>d3.extent(topHistogramBins, (d) => d.length))
    .range([histogramHeight, 0]);
  const rightHistogramYScale = d3
    .scaleLinear()
    .domain(<[number, number]>d3.extent(rightHistogramBins, (d) => d.length))
    .range([histogramHeight, 0]);

  const topHistogramBounds = bounds
    .append('g')
    .attr('class', 'top-histogram-bounds')
    .attr('transform', `translate(0, ${-histogramHeight - histogramMargin})`);

  const rightHistogramBounds = bounds
    .append('g')
    .attr('class', 'right-histogram-bounds')
    .attr(
      'transform',
      `translate(${width + histogramMargin + histogramHeight}, 0) rotate(90)`
    );

  const generateTopHistogramArea = d3
    .area<Bin<Datum, number>>()
    .x((d) => xScale((d.x0! + d.x1!) / 2))
    .y0(histogramHeight)
    .y1((d) => topHistogramYScale(d.length))
    .curve(d3.curveBasis);
  const generateRightHistogramArea = d3
    .area<Bin<Datum, number>>()
    .x((d) => yScale((d.x0! + d.x1!) / 2))
    .y0(histogramHeight)
    .y1((d) => rightHistogramYScale(d.length))
    .curve(d3.curveBasis);

  const topHistogram = topHistogramBounds
    .append('path')
    .attr('class', 'histogram-area')
    .attr('d', generateTopHistogramArea(topHistogramBins));

  const rightHistogram = rightHistogramBounds
    .append('path')
    .attr('class', 'histogram-area')
    .attr('d', generateRightHistogramArea(rightHistogramBins));

  // hover lines
  const hoverGroup = bounds.append('g').attr('id', '#hoverGroup');
  const hoverLineThickness = 10;
  const horizontalLine = hoverGroup.append('rect').attr('class', 'hover-line');
  const verticalLine = hoverGroup.append('rect').attr('class', 'hover-line');
  d3.selectAll('.hover-line')
    // prevents the lines from capturing hover effects
    .style('pointer-events', 'none')
    // smooths the movement of hover lines
    .style('transition', 'all 0.2s ease-out')
    .style('mix-blend-mode', 'color-burn');

  // evt handlers
  type EvtHandler = (e: MouseEvent, d: Datum) => void;

  const onVoronoiMouseEnter: EvtHandler = (_, d) => {
    tooltip.style('opacity', 1);
    hoverGroup.style('opacity', 1);

    const x = `calc(-50% + ${xScale(xAccessor(d)) + margin.left}px)`;
    const y = `calc(-100% + ${yScale(yAccessor(d)) + margin.top}px)`;

    tooltip.style('transform', `translate(${x},${y})`);

    hoverGroup
      .append('circle')
      .attr('class', 'tooltip-dot')
      .attr('cx', xScale(xAccessor(d)))
      .attr('cy', yScale(yAccessor(d)))
      .attr('r', 7)
      .style('pointer-events', 'none');

    horizontalLine
      .attr('x', xScale(xAccessor(d)))
      .attr('y', yScale(yAccessor(d)) - hoverLineThickness / 2)
      .attr(
        'width',
        width - xScale(xAccessor(d)) + histogramHeight + histogramMargin
      )
      .attr('height', hoverLineThickness);
    verticalLine
      .attr('x', xScale(xAccessor(d)) - hoverLineThickness / 2)
      .attr('y', -histogramHeight - histogramMargin)
      .attr('width', hoverLineThickness)
      .attr('height', yScale(yAccessor(d)) + histogramHeight + histogramMargin);

    tooltip.select('#date').html(formatDate(d.datetime));
    tooltip.select('#min-temperature').html(formatNumber(yAccessor(d)));
    tooltip.select('#max-temperature').html(formatNumber(xAccessor(d)));
  };

  const onVoronoiMouseLeave: EvtHandler = (_, d) => {
    tooltip.style('opacity', 0);
    hoverGroup.style('opacity', 0);
    hoverGroup.selectAll('.tooltip-dot').remove();
  };

  voronoiCells
    .on('mouseenter', onVoronoiMouseEnter)
    .on('mouseleave', onVoronoiMouseLeave);
})();
