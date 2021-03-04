import * as d3 from 'd3';
import jsonldVis from '../src_new/';
import data from './example.json';

jsonldVis(d3);

d3.jsonldVis(data, '#graph', {
	w: 800,
//	h: 600,
	maxLabelWidth: 250,
	tipClassName: 'tip-class',
	transitionDuration: 250,
	transitionEase: 'cubic-out'
});
