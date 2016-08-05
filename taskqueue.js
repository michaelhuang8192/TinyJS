
var Events = require("events");
var nextTick = process.nextTick;

function TaskQueue(maxConcurrentTask, defaultTaskExecuter, numPriorities) {
	Events.constructor.call(this);

	this.inPendingCount = 0;
	this.inProgressCount = 0;
	this.maxConcurrentTask = Math.max(maxConcurrentTask || 0, 0);
	this.defaultTaskExecuter = (defaultTaskExecuter || function() {
		console.log("No Default task executer");
		this.done();

	}).bind(this);

	this.numPriorities = Math.max(1, numPriorities || 0);
	this._priorityList = [];
	for(var i = 0; i < this.numPriorities; i++)
		this._priorityList.push([]);

	this.__schedule = __schedule.bind(this);
}

TaskQueue.prototype = Object.create(Events.prototype);
TaskQueue.prototype.constructor = TaskQueue;

TaskQueue.prototype.add = function(task, executer, priority) {
	priority = Math.min(Math.max(0, priority || 0), this.numPriorities - 1);
	this._priorityList[priority].push({
		task: task,
		executer: executer != null ? executer.bind(this) : this.defaultTaskExecuter,
		ts: new Date().getTime()
	});
	this.inPendingCount++;
	nextTick(this.__schedule);
};

TaskQueue.prototype.done = function() {
	this.inProgressCount--;

	if(this.inPendingCount == 0 && this.inProgressCount == 0)
		this.emit("finish");
	
	else if(this.inPendingCount)
		this.__schedule();

};

function __schedule() {
	var priority = this.numPriorities - 1;
	while(this.inPendingCount > 0 && this.inProgressCount < this.maxConcurrentTask) {
		var queue = this._priorityList[priority--];
		while(queue.length > 0 && this.inProgressCount < this.maxConcurrentTask) {
			var taskDesc = queue.shift();

			this.inPendingCount--;
			this.inProgressCount++;

			nextTick(taskDesc.executer, taskDesc.task);
		}
	}
};

module.exports = exports = function(maxConcurrentTask, defaultTaskExecuter, numPriorities) {
	return new TaskQueue(maxConcurrentTask, defaultTaskExecuter, numPriorities);
};
