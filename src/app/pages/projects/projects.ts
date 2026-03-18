import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type ProjectStatus = 'On track' | 'Review' | 'Planning' | 'At risk';

interface ProjectRecord {
  id: string;
  name: string;
  summary: string;
  owner: string;
  target: string;
  status: ProjectStatus;
  budget: string;
  location: string;
  description: string;
  milestones: string[];
  notes: string[];
}

const PROJECTS: ProjectRecord[] = [
  {
    id: 'civic-centre-refresh',
    name: 'Civic Centre refresh',
    summary: 'Interior works, meeting space upgrades, and accessibility adjustments.',
    owner: 'Facilities',
    target: 'Q2 2026',
    status: 'On track',
    budget: 'GBP 184,000',
    location: 'Northleach Civic Centre',
    description:
      'A phased refurbishment programme focused on reception flow, accessible circulation, lighting upgrades, and flexible public meeting space usage.',
    milestones: [
      'Reception redesign signed off',
      'Contractor mobilisation complete',
      'Accessibility audit scheduled for April'
    ],
    notes: [
      'Joinery lead time remains within tolerance.',
      'Final AV package needs approval before the next procurement gate.'
    ]
  },
  {
    id: 'high-street-signage',
    name: 'High street signage',
    summary: 'Directional updates, public realm consistency, and visitor information points.',
    owner: 'Planning',
    target: 'Q3 2026',
    status: 'Review',
    budget: 'GBP 62,500',
    location: 'Town Centre',
    description:
      'A signage refresh covering wayfinding, visitor information, and visual consistency across the high street and linked pedestrian routes.',
    milestones: [
      'Draft sign family prepared',
      'Conservation feedback under review',
      'Supplier shortlist agreed'
    ],
    notes: [
      'Final materials choice depends on planning comments.',
      'Public consultation summary to be incorporated into the next revision.'
    ]
  },
  {
    id: 'community-grant-round',
    name: 'Community grant round',
    summary: 'Funding intake, assessment workflow, and award communications.',
    owner: 'Community',
    target: 'Q4 2026',
    status: 'Planning',
    budget: 'GBP 120,000',
    location: 'Council Administration',
    description:
      'A structured grant round covering application intake, reviewer scoring, moderation, and award notification workflows for local groups.',
    milestones: [
      'Eligibility rules drafted',
      'Assessment panel being confirmed',
      'Applicant guidance due next sprint'
    ],
    notes: [
      'Online submission form still needs final field review.',
      'Decision timeline should be published before applications open.'
    ]
  },
  {
    id: 'public-works-tracker',
    name: 'Public works tracker',
    summary: 'Coordination view for active maintenance, resurfacing, and streetscape items.',
    owner: 'Operations',
    target: 'May 2026',
    status: 'At risk',
    budget: 'GBP 88,300',
    location: 'Town-wide',
    description:
      'A consolidated tracking stream for street works with a focus on sequencing, public notices, and reducing clashes across maintenance windows.',
    milestones: [
      'Work package list imported',
      'Dependency map needs completion',
      'Resident notification templates ready'
    ],
    notes: [
      'Scheduling data is incomplete for two suppliers.',
      'Escalation required if resurfacing dates slip again.'
    ]
  }
];

@Component({
  selector: 'app-projects-page',
  imports: [RouterLink],
  templateUrl: './projects.html'
})
export class ProjectsPage {
  protected readonly projects = PROJECTS;
  protected readonly searchQuery = signal('');
  protected readonly filteredProjects = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();

    if (!query) {
      return this.projects;
    }

    return this.projects.filter((project) => project.name.toLowerCase().includes(query));
  });
  protected readonly selectedProjectId = signal(PROJECTS[0].id);
  protected readonly selectedProject = computed(
    () =>
      this.filteredProjects().find((project) => project.id === this.selectedProjectId()) ??
      this.filteredProjects()[0] ??
      this.projects.find((project) => project.id === this.selectedProjectId()) ??
      this.projects[0]
  );

  protected updateSearchQuery(query: string): void {
    this.searchQuery.set(query);

    const nextMatch = this.filteredProjects().find((project) => project.id === this.selectedProjectId());

    if (!nextMatch && this.filteredProjects().length > 0) {
      this.selectedProjectId.set(this.filteredProjects()[0].id);
    }
  }

  protected selectProject(projectId: string): void {
    this.selectedProjectId.set(projectId);
  }

  protected statusClasses(status: ProjectStatus): string {
    switch (status) {
      case 'On track':
        return 'bg-emerald-100 text-emerald-700';
      case 'Review':
        return 'bg-amber-100 text-amber-700';
      case 'Planning':
        return 'bg-sky-100 text-sky-700';
      case 'At risk':
        return 'bg-rose-100 text-rose-700';
    }
  }
}