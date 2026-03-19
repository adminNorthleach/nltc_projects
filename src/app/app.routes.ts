import { Routes } from '@angular/router';

import { DashboardPage } from './pages/dashboard/dashboard';
import { EditProjectPage } from './pages/edit-project/edit-project';
import { HomePage } from './pages/home/home';
import { NewProjectPage } from './pages/new-project/new-project';
import { NewProjectStepPage } from './pages/new-project-step/new-project-step';
import { ProjectsPage } from './pages/projects/projects';

export const routes: Routes = [
	{
		path: '',
		component: HomePage
	},
	{
		path: 'dashboard',
		component: DashboardPage
	},
	{
		path: 'projects/new',
		component: NewProjectPage
	},
	{
		path: 'projects/:id/edit',
		component: EditProjectPage
	},
	{
		path: 'projects/:id/steps/new',
		component: NewProjectStepPage
	},
	{
		path: 'projects',
		component: ProjectsPage
	}
];
