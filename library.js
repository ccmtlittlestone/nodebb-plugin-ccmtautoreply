"use strict";
var controllers = require('./lib/controllers'),

	plugin = {};

var posts = module.parent.require('../src/posts');
var db = module.parent.require('../src/database');
var async = require('async');
var Topics = module.parent.require('../src/topics');
var _=require("lodash");
var nconf = module.parent.require('nconf');

plugin.init = function(params, callback) {
	var router = params.router,
		hostMiddleware = params.middleware,
		hostControllers = params.controllers;

	// We create two routes for every view. One API call, and the actual route itself.
	// Just add the buildHeader middleware to your route and NodeBB will take care of everything for you.

	router.get('/admin/plugins/quickstart', hostMiddleware.admin.buildHeader, controllers.renderAdminPage);
	router.get('/api/admin/plugins/quickstart', controllers.renderAdminPage);
	router.get('/api/plugins/quickstart/categories', controllers.categoriesPage);
	router.get('/api/plugins/quickstart/', controllers.renderPage);

	callback();
};

plugin.addAdminNavigation = function(header, callback) {
	header.plugins.push({
		route: '/plugins/quickstart',
		icon: 'fa-tint',
		name: 'Quickstart'
	});

	callback(null, header);
};

plugin.autoreply=function(data,next_to_go){

	function pick_topics(arr) {
		if (arr.length <= 2) return arr
		var obj = {}
		// 遍历数组
		for (var i=0,l=arr.length;i<l;i++) {
			if (!obj[arr[i]]) {
				obj[arr[i]] = 1
			} else {
				obj[arr[i]]++
			}
		}
		// 遍历 obj
		var keys = Object.keys(obj)
		var maxNum = 0, maxEle
		for (var i=0;i<keys.length;i++) {
			if (obj[keys[i]] > maxNum) {
				maxNum = obj[keys[i]]
				maxEle = keys[i]
			}
		}
		var arr_result=[];
		for(var key in obj){
			if(obj[key]==maxNum){
				arr_result.push(key)
			}
		}
		var hash=maxEle+":"+maxNum;
		return arr_result
	}

	var tags=data.topic.tags;
	var ARR=[];
	var arr_to_recommend=[];
	if(!tags.length){  //如果此贴子没有任何标签
		async.waterfall([
			function (callback) {
				db.getSortedSetRevRange("group:administrators:members",0,-1,function (err,admins) {
					callback(null,admins)
				})
			},
			function (admins,next) {
				db.getSortedSetRevRange("tag:recommend:topics",0,-1,function(err,the_topics){
					async.each(the_topics,function (the_topic,callback) {
						Topics.getTopicData(the_topic,function (err,topic) {
							if(topic&&admins.indexOf(topic.uid)>=0&&topic.deleted=='0'){
								arr_to_recommend.push(topic)
							}
							callback();
						})
					},function (err){
						if(err){
							console.log(err)
							next(err)
						}else{
							arr_to_recommend=arr_to_recommend.length>2?[arr_to_recommend[0],arr_to_recommend[1]]:arr_to_recommend; //取最后两项
							next(null,arr_to_recommend)
						}
					})
				})

			}
		],function (err,results) {
			data.topic.relatedTopics=results;
			next_to_go(null,data);
		})

	}else{　　//如果有标签
		async.waterfall([
			function (callback) {
				db.getSortedSetRevRange("group:administrators:members",0,-1,function (err,admins) {
					callback(null,admins)
				})
			},
			function (admins,next) {
				async.each(tags,function (x,callback) {
					db.getSortedSetRevRange("tag:"+x.value+":topics",0,-1,function (err,the_tags) {
						ARR=ARR.concat(the_tags);
						callback();
					})
				},function (err) {
					if(err){
						console.log(err)
					}else {
						_.pull(ARR,data.topic.tid)  //拿掉这个帖子本身
						var selected_arr=[];
						Topics.getTopicsData(ARR,function(err,selected_topics) {
						  	for(let i=0;i<selected_topics.length;i++){
						  		if(selected_topics[i].cid=='24'){
						  			selected_arr.push(selected_topics[i].tid)
								}
							}
							var best_match_topics=pick_topics(selected_arr);
							Topics.getTopicsData(best_match_topics,function (err,topics) {
								if(topics.length==2){
									arr_to_recommend=topics;
									next(null,arr_to_recommend)
								}else if(topics.length<2){
									arr_to_recommend=topics;
									db.getSortedSetRevRange("tag:recommend:topics",0,-1,function(err,the_topics){
										async.each(the_topics,function (the_topic,callback) {
											Topics.getTopicData(the_topic,function (err,topic) {
												if(topic&&admins.indexOf(topic.uid)>=0&&topic.deleted=='0'&&arr_to_recommend.length<2){
													arr_to_recommend.push(topic)
												}
												callback();
											})
										},function (err){
											if(err){
												console.log(err)
												next(err)
											}else{
												next(null,arr_to_recommend)
											}
										})
									})
								}else{
									for (var i=0;i<topics.length;i++){
										if(topics[i]&&admins.indexOf(topics[i].uid)>=0){
											arr_to_recommend.push(topics[i])
										}
									}
									if(arr_to_recommend.length==0){
										arr_to_recommend.push(topics[topics.length-1])
										arr_to_recommend.push(topics[topics.length-2])
									}else if(arr_to_recommend.length==1){
										arr_to_recommend.push(topics[topics.length-1])
									}else if(arr_to_recommend.length>2){
										arr_to_recommend=[arr_to_recommend[arr_to_recommend.length-1],arr_to_recommend[arr_to_recommend.length-2]]
									}
									next(null,arr_to_recommend)
								}
							})
						})
					}
				})
			}
		],function (err,result) {
			data.topic.relatedTopics=result;
			next_to_go(null,data);
		})

	}

};

module.exports = plugin;
