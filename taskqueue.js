
var Events = require("events");

function TaskQueue(maxConcurrentTask, defaultTaskExecuter, numPriorities) {
	Events.constructor.call(this);

	this.inPendingCount = 0;
	this.inProgressCount = 0;
	this.maxConcurrentTask = Math.max(maxConcurrentTask || 0, 5);
	this.defaultTaskExecuter = defaultTaskExecuter || function() {
		console.log("No Default task executer");
		this.done();
	};

	this.numPriorities = Math.max(1, numPriorities || 0);
	this._priorityList = [];
	for(var i = 0; i < this.numPriorities; i++)
		this._priorityList.push([]);

	this.__timeout = null;
}

TaskQueue.prototype = Object.create(Events.prototype);
TaskQueue.prototype.constructor = TaskQueue;

TaskQueue.prototype.add = function(task, executer, priority) {
	priority = Math.min(Math.max(0, priority || 0), this.numPriorities - 1);
	this._priorityList[priority].push({
		task: task,
		executer: executer,
		ts: new Date().getTime()
	});
	this.inPendingCount++;
	this.__scheduleAsync();
};

TaskQueue.prototype.done = function() {
	this.inProgressCount--;
	this.__schedule();
};

TaskQueue.prototype.__scheduleAsync = function() {
	if(this.__timeout !== null) return;

	var _this = this;
	this.__timeout = setTimeout(function() {
		_this.__timeout = null;
		_this.__schedule();
	}, 0);
};

TaskQueue.prototype.__schedule = function() {
	if(this.__timeout !== null) {
		clearTimeout(this.__timeout);
		this.__timeout = null;
	}

	var priority = this.numPriorities - 1;
	while(this.inPendingCount > 0 && this.inProgressCount < this.maxConcurrentTask) {
		var queue = this._priorityList[priority--];
		while(queue.length > 0 && this.inProgressCount < this.maxConcurrentTask) {
			var taskDesc = queue.shift();
			var executer = (taskDesc.executer || this.defaultTaskExecuter);

			this.inPendingCount--;
			this.inProgressCount++;

			this.__execute(taskDesc.task, executer);
		}
	}

	if(this.inProgressCount == 0) {
		var _this = this;
		setTimeout(function() {
			_this.emit("finish");
		}, 0);
	}
};

TaskQueue.prototype.__execute = function(task, executer) {
	var _this = this;
	setTimeout(function() {
		executer.call(_this, task);
	}, 0);
};


module.exports = exports = function(maxConcurrentTask, defaultTaskExecuter, numPriorities) {
	return new TaskQueue(maxConcurrentTask, defaultTaskExecuter, numPriorities);
};
