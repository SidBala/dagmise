# dagmise

A directed acyclic graph of promises.

What follows is an example of how you could use this module.

```javascript
var whenode = require('when/node');
var fs = whenode.liftAll(require('fs')); // make node fs functions promise like
var marked = require('marked');
var jade = require('jade');
```

First you must declare the edges of the graph like this. Nodes are identified by strings (which in this example happen to be filenames, but could be anything).

```javascript
dag.add('template.jade', 'index.html'); // 'template.jade' -> 'index.html'
dag.add('contents.md', 'index.html'); // 'contents.md' -> 'index.html'
```

Then setup a function that returns a promise for each node. Each function gets passed an object with the result of the promises it depends on (those nodes that point to it).

```javascript
dag.task('contents.md', function () {
    return fs.readFile('contents.md', 'utf8').then(marked);
});

dag.task('template.jade', function () {
    // resolve to a comiled jade template that we can later pass the rendered markdown as locals to.
    return fs.readFile('template.jade', 'utf8').then(jade.compile);
});

dag.task('index.html', function (deps) {
    var template = deps['template.jade'];
    var htmlcontents = deps['contents.md'];
    return fs.writeFile('index.html', template({ contents: htmlcontents }));
});
```


Then you can run `dag.make('index.html')` to get a pending promise that will be resolved when `'index.html'`'s task and all its depenencies have been resolved.

When a task is executed when walking the graph for dependencies, the node's value (see [dager](https://github.com/spelufo/dager)) is replaced by the promise, so subsequent visits to the node will not trigger repeated execution of the task, instead they will yield the same promise it gave the first time. For this reason, running make again will produce the same value, without reexecution of any of the tasks.

`dag.update('node')` will revert the node's task and those of the nodes that depend on that task to their unrun starting state. `dag.reset()` will revert all the nodes.