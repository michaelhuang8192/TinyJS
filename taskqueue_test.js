var mTaskQueue = require("./taskqueue");


var MAX_TASK = 3;
var NUM_PRIORITIES = 2;
var gTaskQueue = mTaskQueue(MAX_TASK, executer, NUM_PRIORITIES).on('finish',  ()=> {
	console.log("All Done");
});

function executer(task) {
	console.log(task.name);

	if(task.name == 1) {
		this.add({name: 12}, null, 1);
	}

	this.done();
}

gTaskQueue.add({name: 1}, null, 0);
gTaskQueue.add({name: 2}, null, 1);
gTaskQueue.add({name: 3}, null, 0);
gTaskQueue.add({name: 4}, null, 0);
gTaskQueue.add({name: 5}, null, 0);
gTaskQueue.add({name: 6}, null, 0);
gTaskQueue.add({name: 7}, null, 0);
