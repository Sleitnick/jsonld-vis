import { tree } from 'd3';
import d3Tip from 'd3-tip';

const ID_NODE_FILL_COLOR = '#410099';
const ID_NODE_STROKE_COLOR = '#410099';
const NODE_FILL_COLOR = '#B388FF';
const NODE_STROKE_COLOR = '#B388FF';
const EMPTY_FILL_COLOR = '#FFFFFF';

const COLOR_PURPLE_DARK = '#410099';
const COLOR_PURPLE_LIGHT = '#B388FF';

export default function(d3) {

	// Browserify
	// if (!d3.tip) {
	// 	require('d3-tip')(d3);
	// }

	// Webpack
	if (!d3.tip) {
		d3.tip = d3Tip;
	}

	d3.jsonldVis = (jsonld, selector, config = {}) => {

		const width = config.w || 800;
		const maxLabelWidth = config.maxLabelWidth || 250;
		const dx = 15;
		const dy = 100;

		const diagonal = d3.linkHorizontal().x((d) => d.y).y((d) => d.x);
		const tree = d3.tree().nodeSize([dx, dy]);

		const margin = {
			top: 10,
			right: 120,
			bottom: 10,
			left: dy
		};

		const root = d3.hierarchy(jsonldTree(jsonld));//d3.hierarchy(jsonld);

		
		function jsonldTree(source) {
			let tree = {};
			if ('@id' in source) {
				tree.isIdNode = true;
				tree.name = source['@id'];
				if (tree.name.length > maxLabelWidth / 9) {
				tree.valueExtended = tree.name;
				tree.name =
					'…' + tree.valueExtended.slice(-Math.floor(maxLabelWidth / 9));
				}
			} else {
				tree.isIdNode = true;
				tree.isBlankNode = true;
				// random id, can replace with actual uuid generator if needed
				tree.name = '_:b' + Math.random().toString(10).slice(-7);
			}
		
			let children = [];
			Object.keys(source).forEach((key) => {
				if (key === '@id' || key === '@context' || source[key] === null) return;
				let valueExtended, value;
				if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
				children.push({
					name: key,
					children: [jsonldTree(source[key])]
				});
				} else if (Array.isArray(source[key])) {
				children.push({
					name: key,
					children: source[key].map(item => {
					if (typeof item === 'object') return jsonldTree(item);
					return { name: item };
					})
				});
				} else {
				valueExtended = source[key];
				value = valueExtended;
				if (value.length > maxLabelWidth / 9) {
					value = value.slice(0, Math.floor(maxLabelWidth / 9)) + '…';
					children.push({
					name: key,
					value,
					valueExtended
					});
				} else {
					children.push({
					name: key,
					value
					});
				}
				}
			});
		
			if (children.length) tree.children = children;
			return tree;
		}


		root.x0 = dy / 2;
		root.y0 = 0;
		root.descendants().forEach((d, i) => {
			d.id = i;
			d._children = d.children;
			if (d.depth && d.data.name.length !== 7) {
				d.children = null;
			}
		});

		const svg = d3
			.select(selector)
			.append("svg")
			.attr("viewBox", [-margin.left, -margin.top, width, dx])
			.style("user-select", "none");
		
		// Links (lines between nodes):
		const gLink = svg.append("g")
			.attr("fill", "none")
			// .attr("stroke", "#555")
			// .attr("stroke-opacity", 0.4)
			// .attr("stroke-width", 1)
			.attr("class", "jsonld-vis-link");

		// Nodes:
		const gNode = svg.append("g")
			//.attr("cursor", "pointer")
			.attr("class", "jsonld-vis-node")
			.attr("pointer-events", "all");

		function update(source) {
			const duration = d3.event && d3.event.altKey ? 2500 : 250;
			const nodes = root.descendants().reverse();
			const links = root.links();
			tree(root);
			let left = root;
			let right = root;
			root.eachBefore((node) => {
				if (node.x < left.x) {
					left = node;
				}
				if (node.x > right.x) {
					right = node;
				}
			});
			const height = (right.x - left.x + margin.top + margin.bottom);
			const transition = svg.transition()
				.duration(duration)
				.attr("viewBox", [-margin.left, left.x - margin.top, width, height])
				.tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));
			const node = gNode.selectAll("g")
				.data(nodes, (d) => d.id);
			const nodeEnter = node.enter().append("g")
				.attr("transform", () => `translate(${source.y0}, ${source.x0})`)
				.attr("fill-opacity", 0)
				.attr("stroke-opacity", 0)
				//.attr("class", (d) => "jsonld-vis-node" + (d.children ? " jsonld-vis-node-clickable" : ""))
				.attr("cursor", (d) => d._children ? "pointer" : "default")
				.on("click", (event, d) => {
					d.children = d.children ? null : d._children;
					update(d);
				});
			nodeEnter.append("circle")
				.attr("r", 4)
				.attr("fill", (d) => d._children ? COLOR_PURPLE_DARK : COLOR_PURPLE_LIGHT)
				.attr("stroke-width", 10);
			nodeEnter.append("text")
				.attr("dy", "0.31em")
				.attr("x", (d) => d._children ? -6 : 6)
				.attr("text-anchor", (d) => d._children ? "end" : "start")
				.text((d) => d.data.name)
				.clone(true).lower()
				.attr("stroke-linejoin", "round")
				.attr("stroke-width", 3)
				.attr("stroke", "white");
			const nodeUpdate = node.merge(nodeEnter).transition(transition)
				.attr("transform", (d) => `translate(${d.y}, ${d.x})`)
				.attr("fill-opacity", 1)
				.attr("stroke-opacity", 1);
			const nodeExit = node.exit().transition(transition).remove()
				.attr("transform", (d) => `translate(${source.y}, ${source.x})`)
				.attr("fill-opacity", 0)
				.attr("stroke-opacity", 0);
			const link = gLink.selectAll("path")
				.data(links, (d) => d.target.id);
			const linkEnter = link.enter().append("path")
				.attr("d", () => {
					const o = {x: source.x0, y: source.y0};
					return diagonal({source: o, target: o});
				});
			link.merge(linkEnter).transition(transition)
				.attr("d", diagonal);
			link.exit().transition(transition).remove()
				.attr("d", () => {
					const o = {x: source.x, y: source.y};
					return diagonal({source: o, target: o});
				});
			root.eachBefore((d) => {
				d.x0 = d.x;
				d.y0 = d.y;
			});
		}

		update(root);

		return svg.node();

	};

}