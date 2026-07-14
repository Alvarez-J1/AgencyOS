const assert = require('node:assert/strict');
const test = require('node:test');

const { buildDemoWorkspace } = require('../src/data/demoWorkspace');

test('demo workspace seed creates a believable, internally consistent dataset', () => {
  const { clients, projects, tasks } = buildDemoWorkspace(new Date('2026-07-14T12:00:00Z'));
  const projectNames = new Set(projects.map((project) => project.name));
  const completedTasks = tasks.filter((task) => task.status === 'Completed');
  const pendingTasks = tasks.filter((task) => task.status !== 'Completed');
  const activeProjects = projects.filter((project) => project.status !== 'Completed');

  assert.equal(clients.length, 24);
  assert.equal(projects.length, 16);
  assert.equal(tasks.length, 44);
  assert.equal(activeProjects.length, 13);
  assert.equal(completedTasks.length, 32);
  assert.equal(pendingTasks.length, 12);
  assert.equal(completedTasks.every((task) => task.completedAt instanceof Date), true);
  assert.deepEqual(
    tasks.filter((task) => !projectNames.has(task.project)).map((task) => task.id),
    []
  );
});
