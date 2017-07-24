(function(){
	if (window.Loader)return;
    
    window.Loader = new LoaderFactory();
    window.LoaderFactory = LoaderFactory;
    
    function LoaderFactory() {
	    	
    	var that = this;
		//存放hash历史记录
		var $hash = [];
		//页面片段缓存
		var $cache = [];
		var configs = {
			//页面容器Id
			containerId: '',
			//页面容器
			container: null,
			//location中的hash前缀
			prefix: '#/page/hx/',
			//页面片段存放根目录 
			templateUrl: '/template/'
		};
		var $scope = {};
		var currHistory;
		/**
		 * 加载页面入口
		 * url: 跳转页面的url
		 * data: 跳转页面传入的数据
		 * cache: boolean类型，默认为;ture-保存页面状态	false-不保存页面状态
		 * callback: 回调函数
		 * 
		 * */
		function state(url,data,cache,callback){
			//加载页面
			_startRoute(url,data,cache);
		}
		//回退方法
		function back(){
			if($hash.length < 1){
				return;
			}else{
				//获取当前页面的hash
				var currHash = window.location.hash.split(configs.prefix)[1];
				history.back();
			}
		}
		//初始化url
		function _initUrl(){
			_getContainer();
			var hash = window.location.hash;
			if(hash.indexOf(configs.prefix) > -1){
				var hash = hash.split(configs.prefix)[1];
				_startRoute(hash);
			}else{
				var hash = $(_getContainer()).attr("href");
				if(hash){
					_startRoute(hash.substring(1,hash.length));
				}
			} 
		}
		//将数据存入当前作用域
		function _setScope(data){
			$scope = data;
		}
		//获取作用域
		var _getScope = function(){
			return $scope;
		};
		//设置页面加载容器Id
		function _setOption(optin){
			$.extend(configs,optin);
		}
		//获取页面容器
		function _getContainer(){
			var _container;
			if(!configs.containerId){
				_container = $("main-view");
			}else{
				_container = $("#"+configs.containerId); 
			}
			if(_container.length == 0){
				console.error("没有发现容器！");return;
			}
			configs.container = _container[0];
			return _container[0];
		}
		//开始路由
		function _startRoute(hash,option){
			//设置作用域
			option && option.data && _setScope(option.data);
			var cacheHistory = _isCache(hash);
			if(cacheHistory && option && option.isCache){
				console.log("缓存页面，不需要加载片段和更新数据");
				_cacheState(cacheHistory);
			}else{
				var date = new Date();
	        	var hashCode = hash + Date.parse(date)+date.getMilliseconds();//保存个唯一值,可换成md5  base64等
	        	var history = {
	        		hashCode: hashCode,
	        		hash: hash
	        	};
	        	if(option && option.isCache) history.isCache = true;
	        	if(option && option.data) history.userData = option.data;
	        	if(option && option.enter) history.enter = option.enter;
	        	if(option && option.leave) history.leave = option.leave;
	        	_cacheState(history,true);
			}
		}
		//加载子路由
		function _loadSub(data,callback){
			var reg = /<view(.*?)><\/view>/g;
		 	var views = data.match(reg);
		 	//为了确保字符串拆分不出错,牺牲点效率使用dom来获取href的hash值
		 	var href = document.createElement("DIV");
		 	
		 	var promise = new Promise(function(resolve,reject){
				function iterLoad(data){
					var views = data.match(reg);
					if(!views){
						resolve(data);
					}
					for(var i=0;i < views.length; i++){
						var view = views[i];
						$(href).html(view);
						var hash = $(href).find("view").attr("href").replace("#",'');
						_loadContent(hash).done((function(_view){
							return function(result){
								data = data.replace(_view,result);
								iterLoad(data);
							}
						})(view));
					}
				}
				iterLoad(data);
				
		    })
		 	promise.then(function(data){
		 		callback && callback(data);
		 	});
		}
		//modal模式
		function _modal(hash,option){
			//设置作用域
			option && option.data && _setScope(option.data);
			var cacheHistory = _isCache(hash);
			if(cacheHistory){
				console.log("缓存页面，hohohoho");
	        	_cacheState(history);
			}else{
				//保存片段缓存
				console.log("一个新的页面片段");
				var date = new Date();
	        	var hashCode = hash + Date.parse(date)+date.getMilliseconds();//保存个唯一值,可换成md5  base64等
	        	var history = {
	        		hashCode: hashCode,
	        		hash: hash,
	        		isModal: true,
	        		parentCode: currHistory.hashCode
	        	};
	        	if(option && option.targetId) history.targetId = option.targetId;
	        	if(option && option.data) history.userData = option.data;
	        	if(option && option.enter) history.enter = option.enter;
	        	if(option && option.leave) history.leave = option.leave;
	        	_cacheState(history,true);
			}
		}
		//请求页面内容
		function _loadContent(hash){
			var url = _getLoadUrl(hash);
			console.log("看看加载页面 url:"+url);
		    return $.ajax({
		        url : url ,
		        dataType : "text",
		        async:false
		    })
		}
		//获取请求页面的真实url
		function _getLoadUrl(url){
			var currUrl = window.location.href;
			var loadUrl = '';
			if(currUrl.indexOf(configs.prefix) > -1){
				currUrl = currUrl.split(".html")[0];
				loadUrl = currUrl.substring(0,currUrl.lastIndexOf("/")) + configs.templateUrl + url;
				//loadUrl = currUrl.substring(0,currUrl.indexOf(configs.prefix)) + configs.templateUrl + url;
			}else{
				//currUrl = currUrl.substring(0,currUrl.lastIndexOf("/"));
				currUrl = currUrl.split(".html")[0];
				currUrl = currUrl.substring(0,currUrl.lastIndexOf("/"));
				loadUrl += currUrl + configs.templateUrl + url;
			} 
			return loadUrl+'.html';
		}
		//保存片段缓存
		function _setPageCache(hash,callback){
			//判断是否有重复的缓存
			for(var item in $cache){
				if($cache[item].hash == hash){
					callback && callback($cache[item].pageCache);
					return;
				}
			}
			var _callback = function(data){
				var pageCache = {
	        		hash: hash,
	        		pageCache: data
	        	};
	        	$cache.unshift(pageCache);
	        	callback &&  callback(data);
			}
			//加载页面内容
			_loadContent(hash).done(function(data){
				_loadSub(data,_callback);
			});
		}
		//获取片段缓存
		function _getPageCache(hash){
			for(var item in $cache){
				if($cache[item].hash == hash){
					return $cache[item].pageCache;
				}
			}
			return false;
		}
		//判断是否有缓存页面
		function _isCache(hash){
			for(var item in $hash){
				if($hash[item].hash == hash && $hash[item].isCache){
					return $hash[item];
				}
			}
			return false;
		}
		//控制cache页面的隐藏与显示
		function _cacheState(history,isNew){
			//离开当前页面时执行
			currHistory && currHistory.leave && currHistory.leave();
			currHistory = history;
			_changeState();
			if(isNew){
				_appendPage(history);
				if(history.isModal && history.targetId){
	        		$("#"+targetId).append(cache);
	        	}else {
	        		configs.container != null && $(configs.container).append(history.cache);
	        	}
	        	_addHistory(history);
	        	//进入当前页面时执行
	            history.enter && history.enter();
				/*var cache = document.createElement("DIV");
				cache.setAttribute("class","cache active");
				cache.style.position = "inherit";
	        	cache.style.width = "100%";
	        	if(history.isModal && history.targetId){
	        		$("#"+targetId).append(cache);
	        	}else {
	        		configs.container != null && $(configs.container).append(cache);
	        	}
	        	//添加到历史记录
	        	history.cache = cache;
				_addHistory(history);
	        	//加载页面片段
	        	var callback = function(pageCache){
	        		$(cache).html(pageCache);
	        	}
	        	var pageCache = _setPageCache(history.hash,callback);*/
			}else{
				_showCache(history);
			}
			//改变页面片段状态
			function _changeState(){
				for(var item in $hash){
					if(history.isModal && $hash[item].hashCode == history.parentCode){
						$hash[item].isHidden = true;
						_hideCache($hash[item].cache);
					}else if(!$hash[item].isHidden || isNew){
						$hash[item].isMove = true;
						$($hash[item].cache).attr("class",'');
						$($hash[item].cache).remove();
						//清除缓存变量
						$hash[item].cache = null;
					}
				}
			}
			//添加页面片段
			function _appendPage(history){
				var cache = document.createElement("DIV");
				cache.setAttribute("class","cache active");
				cache.style.position = "inherit";
	        	cache.style.width = "100%";
	        	history.cache = cache;
	        	//加载页面片段
	        	var callback = function(pageCache){
	        		$(cache).html(pageCache);
	        	}
	        	var pageCache = _setPageCache(history.hash,callback);
			}
			function _hideCache(cache){
				$(cache).attr("class",'cache hidden');
				cache.style.opacity = 0;
				cache.style.display = 'none';
				cache.style.zIndex = -1;
			}
			function _showCache(history){
				//如果是隐藏状态改为非隐藏
				if(history.isHidden)history.isHidden = false;
				//如果缓存被删除了重新加载页面片段
        		if(history.isMove)_appendPage(history);
        		//根据条件append到页面里	
				if(history.isModal && history.targetId){
	        		$("#"+targetId).append(history.cache);
	        	}else if(history.cache.className.indexOf("hidden") == -1 || history.isMove){
	        		configs.container != null && $(configs.container).append(history.cache);
	        	}
	        	history.cache.setAttribute("class","cache active");
				history.cache.style.opacity = 1;
				history.cache.style.display = 'block';
				history.cache.style.zIndex = 1;
				//进入当前页面时执行
	            history.enter && history.enter();
			}
		}
		//添加到历史记录
		function _addHistory(history){
			var hash = _getHashUrl(history.hash);
			var data = {
				hashCode: history.hashCode
			};
			if($hash.length == 0){
				window.history.replaceState(data,"",hash);
			}else{
				window.history.pushState(data,"",hash);
			}
			$hash.unshift(history);
		}
		//处理location url
		function _getHashUrl(url){
			var currUrl = window.location.href;
			if(currUrl.indexOf(configs.prefix) > -1){
				currUrl = currUrl.substring(0,currUrl.indexOf(configs.prefix));
				currUrl = currUrl.split(configs.prefix)[0] + configs.prefix + url;
			}else{
				//currUrl = currUrl.substring(0,currUrl.lastIndexOf("/"));
				currUrl += configs.prefix+url;
			} 
			return currUrl;
		}
		window.addEventListener("popstate",function(e){
			var state = e.state;
			if(state && state.hashCode){
	            var history,pre_history,next_history;
	            for(var i=0; i < $hash.length;i++){
					if(state.hashCode == $hash[i].hashCode){
						history = $hash[i];
						pre_history = $hash[i - 1];
						next_history = $hash[i + 1];
					}
				}
	            if(history.userData){
	            	console.log("当前页面的数据："+JSON.stringify(history.userData));
	            }
	            if(history && history.isModal){
	            	console.log("modal模式");
	            	//判断上一个history是否为modal模式，是的话从页面上删除
	            	/*if(pre_history.isModal){
	            		for(var item in $cache){
	            			if($cache[item].hash = pre_history.hash){
	            				alert("我前面那个叼毛modal是："+pre_history.hash);
	            				$($cache[item].pageCache).remove();
	            			}
	            		}
	            	}
	            	_cacheState(history.hash,true,history.targetId);*/
	            	_cacheState(history);
	            }
	            if(history && !history.isModal && history.isCache){
	            	console.log("有缓存，不刷新内容");
	            	_cacheState(history);
	            }
	            if(history && !history.isModal){
	            	console.log("无缓存，重新加载内容");
	            	_cacheState(history);
	            }
	        }else{
	        	
	        }
		},false);
		
		window.addEventListener("hashchange",function(e){
			//兼容低版本浏览器，预留
			console.log("改变了 hash"+e.oldURL +" - - "+ e.newURL+"    "+e.target);
		},false);
		
		return {
			start: _initUrl,
			go: state,
			modal: _modal,
			back: back,
			scope: _getScope,
			setOption: _setOption
		};
    };
})();