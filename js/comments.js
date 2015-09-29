var Comments = function(_comments, _videoLen){
	var self = this;

	var colors = ["white","red","pink","orange","yellow","green","cyan","blue","purple","black",
		"niconicowhite","white2","truered","red2","passionorange","orange2","madyellow","yellow2",
		"elementalgreen","green2","marineblue","blue2","nobleviolet","purple2"];

	this.videoLen;
	this.cmts;
	init();
	console.log(this.cmts);

	function init(){
		self.videoLen = _videoLen;
		self.cmts = _.chain(_comments)
			.filter(function(c){
				return c.vpos < _videoLen
			}).map(function(c){
				var cmds = c.command.split(" ");
				c.width = cmtWidth(c);
				c._184 = _.contains(cmds, "184");
				c.color = _.find(cmds, function(cmd){return _.contains(colors, cmd) || cmd.startsWith("#")});
				c.size = _.find(cmds, function(cmd){return _.contains(["big", "small"], cmd)});
				c.pos = _.find(cmds, function(cmd){return _.contains(["ue", "shita", "naka"], cmd)});
				c.device = _.chain(cmds).filter(function(cmd){
					return cmd.startsWith("device:")
				}).map(function(cmd){
					return cmd.slice("device:".length)
				}).first().value();
				return c;
			}).value();
	}
	/*
	// 画面に表示されている文字数(?)
	this.density = function(ms){
		var cnt = 0;
		_.each(cmts, function(cmt){
			cnt += this.visibleLength(cmt, ms);
		});
		return cnt;
	}*/

	// TODO small_big, shita_ue, 半角
	function cmtWidth(cmt){
		return cmt.message.length / 29.5 || 0;
	}

	// volume : [ams, bms]区間の総volume
	function volume(cmts, ams, bms){
		var ret = 0;
		_.each(cmts, function(cmt){
			//console.log(volume1(cmt, bms), volume1(cmt, ams));
			ret += volume1(cmt, bms) - volume1(cmt, ams);
		});
		return ret;
	}

	// volume1 : msまでのcmtのvolume
	function volume1(cmt, ms){
		if(_.contains(["ue", "shita"], cmt.pos)){
			var a = cmt.vpos, b = cmt.vpos + 3000;
			if(ms < a){
				return 0;
			}else{
				return (Math.min(b, ms) - a) * cmt.width
			}
		}else{
			var v = (1 + cmt.width) / 4.0
			var t = cmt.width / v;
			t = Math.min(t, 4000 - t);
			var a = cmt.vpos - 1000, b = cmt.vpos + 3000,
				x = a + t, y = b - t;
			var ret = 0;
			if(a <= ms){
				var p = Math.min(x, ms) - a;
				ret += p * (v * p) / 2;
			}
			if(x <= ms){
				var p = Math.min(y, ms) - x;
				ret += p * (v * t);
			}
			if(y <= ms){
				var q = b - Math.min(b, ms);
				ret += t * (v * t) / 2 - q * (v * q) / 2;
			}
			//console.log("ret", ret);
			return ret;
		}
	}

	//
	function visCount(cmts, ams, bms){
		var ret = 0;
		_.each(cmts, function(cmt){
			var flg = false;
			if(_.contains(["ue", "shita"], cmt.pos)){
				flg |= ams <= cmt.vpos + 3000 && cmt.vpos <= bms;
			}else{
				flg |= ams <= cmt.vpos + 3000 && cmt.vpos - 1000 <= bms;
			}
			ret += flg ? 1 : 0;
		});
		return ret;
	}

	////////////////////////////////////////
	// createLayout (d3.layout.histogram()の拡張)
	// params : yAcs, yMin, yMax, cAcs, cMin, cMax
	this.histogramLayout = function(bin, params){
		bin = defval(bin, 120);
		params = defval(params, {});
		var yAcs = defval(params.yAcs, function(d){return d.length});
		var yMin = defval(params.yMin, function(){return 0});
		var yMax = defval(params.yMax, function(data){return d3.max(data, yAcs)});
		var cAcs = defval(params.cAcs, function(d){return d.density});
		var cMin = defval(params.cMin, function(){return 0});
		var cMax = defval(params.cMax, function(data){return d3.max(data, cAcs)});

		var hist = d3.layout.histogram()
			.bins(bin)
  		.value(function(d){return d.vpos})
  		(this.cmts);

		// cnt, length, time, sum, avg, std, med, density
		// TODO shitaとかbigとかも考慮
		_.each(hist, function(d){
			_.each(d, function(c){
				c.length = c.message.length; // length
			});
			_.sortBy(d, function(c){return c.length});
			d.time = ms2str(d.x);
			d.sum = _.chain(d)
				.map(function(c){return c.length})
				.reduce(function(a,b){return a + b})
				.value();
			d.avg = d.sum / d.length;
			d.std = Math.sqrt(
				_.chain(d)
					.map(function(c){return Math.pow(c.length - d.avg, 2)})
					.reduce(function(a,b){return a+b}).value()
				);
			d.med = d.length == 0 ? 0: d[~~(d.length/2)].length;
			d.density = d.sum / d.dx * 1000
			d.vol = volume(self.cmts, d.x, d.x+d.dx) / d.dx * 1000;
			d.viscnt = visCount(self.cmts, d.x, d.x+d.dx);
		});

		var yScale = d3.scale.linear().domain([yMin(hist), yMax(hist)]).range([0, 1]);
		var cScale = d3.scale.linear().domain([cMin(hist), cMax(hist)]).range([0, 1]);

		_.each(hist, function(d){
			d.y = yScale(yAcs(d));
			d.c = cScale(cAcs(d));
		})

		return hist;
	}

	// command
	this.cmdRates = function(){
		return _.chain(this.cmts).map(function(cmt){
			return cmt.command.split(" ");
		}).flatten()
		.countBy(function(cmd){
			return cmd
		}).value();
	};

	console.log(this.cmdRates());
}

//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//