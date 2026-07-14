export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'Todo' | 'In Progress' | 'Completed';

export type Task = {
  _id?: string;
  id: number;
  title: string;
  project: string;
  assignee: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  completedAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};
