import { Routes } from '@angular/router';

import { DashboardPage } from './pages/dashboard/dashboard';
import { HomePage } from './pages/home/home';
import { NewProjectPage } from './pages/new-project/new-project';
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
		path: 'projects',
		component: ProjectsPage
	}
];
