import { computed, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Firestore, collection, collectionData, doc, updateDoc } from '@angular/fire/firestore';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';

type ProjectStepStatus = 'Not started' | 'In progress' | 'Waiting' | 'Completed';

interface ProjectActivity {
  summary: string;
  completedAt: string;
  nextSteps: string;
}

interface ProjectStep {
  name: string;
  status: ProjectStepStatus;
}

interface FirebaseProjectActivity {
  summary?: string;
  completedAt?: string;
  nextSteps?: string;
}

interface FirebaseProjectStep {
  name?: string;
  status?: string;
}

interface ProjectRecord {
  id: string;
  name: string;
  owner: string;
  projectBrief: string;
  activity: ProjectActivity[];
  steps: ProjectStep[];
  dueDate: string;
  createdAt: string;
}

interface FirebaseTimestampLike {
  seconds?: number;
  toDate?: () => Date;
}

interface FirebaseProjectDocument {
  id: string;
  title?: string;
  owner?: string;
  projectBrief?: string;
  background?: string;
  description?: string;
  activity?: FirebaseProjectActivity[];
  steps?: FirebaseProjectStep[];
  dueDate?: string;
  createdAt?: FirebaseTimestampLike | Date | null;
}

@Component({
  selector: 'app-projects-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './projects.html'
})
export class ProjectsPage {
  private readonly firestore = inject(Firestore);
  private readonly formBuilder = new FormBuilder();
  protected readonly progressStatusGroups: ProjectStepStatus[] = [
    'Not started',
    'In progress',
    'Waiting',
    'Completed'
  ];

  protected readonly isLoadingProjects = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly activeDetailTab = signal<'detail' | 'steps' | 'documents' | 'progress' | 'activity'>('detail');
  protected readonly updatingStepIndex = signal<number | null>(null);
  protected readonly isSavingActivity = signal(false);
  protected readonly addStepError = signal<string | null>(null);
  protected readonly addStepSuccess = signal<string | null>(null);
  protected readonly addActivityError = signal<string | null>(null);
  protected readonly addActivitySuccess = signal<string | null>(null);
  protected readonly stepStatusOptions: ProjectStepStatus[] = [
    'Not started',
    'In progress',
    'Waiting',
    'Completed'
  ];
  protected readonly activityForm = this.formBuilder.group({
    summary: ['', [Validators.required, Validators.maxLength(240)]],
    completedAt: [this.currentDateTimeLocal(), Validators.required],
    nextSteps: ['', [Validators.required, Validators.maxLength(240)]]
  });
  protected readonly projects = toSignal(
    collectionData(collection(this.firestore, 'projects'), { idField: 'id' }).pipe(
      map((documents) => {
        this.loadError.set(null);
        this.isLoadingProjects.set(false);

        return (documents as FirebaseProjectDocument[])
          .map((document) => this.mapProjectRecord(document))
          .sort((leftProject, rightProject) => rightProject.createdAt.localeCompare(leftProject.createdAt));
      }),
      catchError(() => {
        this.loadError.set('Projects could not be loaded from Firebase.');
        this.isLoadingProjects.set(false);

        return of([] as ProjectRecord[]);
      })
    ),
    { initialValue: [] as ProjectRecord[] }
  );
  protected readonly filteredProjects = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const projects = this.projects();

    if (!query) {
      return projects;
    }

    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) || project.owner.toLowerCase().includes(query)
    );
  });
  protected readonly selectedProjectId = signal<string | null>(null);
  protected readonly selectedProject = computed(
    () => {
      const filteredProjects = this.filteredProjects();

      if (filteredProjects.length === 0) {
        return null;
      }

      return (
        filteredProjects.find((project) => project.id === this.selectedProjectId()) ??
        filteredProjects[0]
      );
    }
  );

  protected updateSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  protected selectProject(projectId: string): void {
    this.selectedProjectId.set(projectId);
    this.activeDetailTab.set('detail');
    this.resetTabMessages();
  }

  protected setActiveDetailTab(tab: 'detail' | 'steps' | 'documents' | 'progress' | 'activity'): void {
    this.activeDetailTab.set(tab);
    this.resetTabMessages();
  }

  protected async updateProjectStepStatus(stepIndex: number, status: string): Promise<void> {
    const project = this.selectedProject();

    if (!project || !this.isProjectStepStatus(status)) {
      return;
    }

    const currentStep = project.steps[stepIndex];

    if (!currentStep || currentStep.status === status || this.updatingStepIndex() !== null) {
      return;
    }

    this.updatingStepIndex.set(stepIndex);
    this.addStepError.set(null);
    this.addStepSuccess.set(null);

    const nextSteps = project.steps.map((step, index) =>
      index === stepIndex
        ? {
            ...step,
            status
          }
        : step
    );

    try {
      await updateDoc(doc(this.firestore, 'projects', project.id), {
        steps: nextSteps
      });

      this.addStepSuccess.set('Project step status updated successfully.');
    } catch {
      this.addStepError.set('The project step status could not be updated. Please try again.');
    } finally {
      this.updatingStepIndex.set(null);
    }
  }

  protected stepStatusClasses(status: ProjectStepStatus): string {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-100 text-emerald-700';
      case 'In progress':
        return 'bg-sky-100 text-sky-700';
      case 'Waiting':
        return 'bg-amber-100 text-amber-700';
      case 'Not started':
        return 'bg-slate-200 text-slate-700';
    }
  }

  protected countStepsByStatus(steps: ProjectStep[], status: ProjectStepStatus): number {
    return steps.filter((step) => step.status === status).length;
  }

  protected progressPercentage(steps: ProjectStep[], status: ProjectStepStatus): number {
    if (steps.length === 0) {
      return 0;
    }

    return (this.countStepsByStatus(steps, status) / steps.length) * 100;
  }

  protected async addProjectActivity(): Promise<void> {
    const project = this.selectedProject();

    if (!project) {
      return;
    }

    if (this.activityForm.invalid) {
      this.activityForm.markAllAsTouched();
      return;
    }

    if (this.isSavingActivity()) {
      return;
    }

    this.isSavingActivity.set(true);
    this.addActivityError.set(null);
    this.addActivitySuccess.set(null);

    const payload = this.activityForm.getRawValue() as {
      summary: string;
      completedAt: string;
      nextSteps: string;
    };
    const nextActivity: ProjectActivity = {
      summary: payload.summary.trim(),
      completedAt: this.toIsoDateTime(payload.completedAt),
      nextSteps: payload.nextSteps.trim()
    };
    const nextProjectActivity = [...project.activity, nextActivity].sort((leftEntry, rightEntry) =>
      rightEntry.completedAt.localeCompare(leftEntry.completedAt)
    );

    try {
      await updateDoc(doc(this.firestore, 'projects', project.id), {
        activity: nextProjectActivity
      });

      this.addActivitySuccess.set('Activity entry saved successfully.');
      this.activityForm.reset({
        summary: '',
        completedAt: this.currentDateTimeLocal(),
        nextSteps: ''
      });
      this.activityForm.markAsPristine();
      this.activityForm.markAsUntouched();
    } catch {
      this.addActivityError.set('The activity entry could not be saved. Please try again.');
    } finally {
      this.isSavingActivity.set(false);
    }
  }

  protected displayActivityTimestamp(timestamp: string): string {
    if (!timestamp) {
      return 'Not available';
    }

    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(timestamp));
  }

  private mapProjectRecord(document: FirebaseProjectDocument): ProjectRecord {
    return {
      id: document.id,
      name: document.title?.trim() || 'Untitled project',
      owner: document.owner?.trim() || 'Unassigned',
      projectBrief:
        document.projectBrief?.trim() ||
        document.background?.trim() ||
        document.description?.trim() ||
        'No project brief provided.',
      activity: (document.activity ?? [])
        .map((entry) => this.mapProjectActivity(entry))
        .filter((entry): entry is ProjectActivity => entry !== null)
        .sort((leftEntry, rightEntry) => rightEntry.completedAt.localeCompare(leftEntry.completedAt)),
      steps: (document.steps ?? [])
        .map((step) => this.mapProjectStep(step))
        .filter((step): step is ProjectStep => step !== null),
      dueDate: document.dueDate?.trim() || 'Not set',
      createdAt: this.formatCreatedAt(document.createdAt)
    };
  }

  private mapProjectActivity(entry: FirebaseProjectActivity): ProjectActivity | null {
    const summary = entry?.summary?.trim();
    const nextSteps = entry?.nextSteps?.trim();
    const completedAt = entry?.completedAt?.trim();

    if (!summary || !nextSteps || !completedAt) {
      return null;
    }

    return {
      summary,
      completedAt,
      nextSteps
    };
  }

  private mapProjectStep(step: FirebaseProjectStep): ProjectStep | null {
    const stepName = step?.name?.trim();
    const stepStatus = step?.status;

    if (!stepName || !this.isProjectStepStatus(stepStatus)) {
      return null;
    }

    return {
      name: stepName,
      status: stepStatus
    };
  }

  private isProjectStepStatus(status: string | undefined): status is ProjectStepStatus {
    return status === 'Not started' || status === 'In progress' || status === 'Waiting' || status === 'Completed';
  }

  private formatCreatedAt(createdAt: FirebaseProjectDocument['createdAt']): string {
    if (!createdAt) {
      return '';
    }

    if (createdAt instanceof Date) {
      return createdAt.toISOString();
    }

    if (typeof createdAt.toDate === 'function') {
      return createdAt.toDate().toISOString();
    }

    if (typeof createdAt.seconds === 'number') {
      return new Date(createdAt.seconds * 1000).toISOString();
    }

    return '';
  }

  protected displayCreatedAt(createdAt: string): string {
    if (!createdAt) {
      return 'Not available';
    }

    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(createdAt));
  }

  private currentDateTimeLocal(): string {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;

    return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16);
  }

  private toIsoDateTime(value: string): string {
    const parsedDate = new Date(value);

    return Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
  }

  private resetTabMessages(): void {
    this.addStepError.set(null);
    this.addStepSuccess.set(null);
    this.addActivityError.set(null);
    this.addActivitySuccess.set(null);
  }
}