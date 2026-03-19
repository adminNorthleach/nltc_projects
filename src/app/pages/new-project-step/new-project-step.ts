import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Firestore, doc, docData, updateDoc } from '@angular/fire/firestore';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';

type ProjectStepStatus = 'Not started' | 'In progress' | 'Waiting' | 'Completed';

interface ProjectStep {
  name: string;
  status: ProjectStepStatus;
}

interface FirebaseProjectStep {
  name?: string;
  status?: string;
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
  steps?: FirebaseProjectStep[];
  dueDate?: string;
  createdAt?: FirebaseTimestampLike | Date | null;
}

interface ProjectRecord {
  id: string;
  title: string;
  owner: string;
  projectBrief: string;
  steps: ProjectStep[];
  dueDate: string;
  createdAt: string;
}

@Component({
  selector: 'app-new-project-step-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './new-project-step.html'
})
export class NewProjectStepPage {
  private readonly route = inject(ActivatedRoute);
  private readonly firestore = inject(Firestore);
  private readonly formBuilder = new FormBuilder();
  private successMessageTimeoutId: number | null = null;
  private readonly projectId = this.route.snapshot.paramMap.get('id');

  protected readonly isLoadingProject = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly isSavingStep = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saveSuccess = signal<string | null>(null);
  protected readonly stepStatusOptions: ProjectStepStatus[] = [
    'Not started',
    'In progress',
    'Waiting',
    'Completed'
  ];
  protected readonly stepForm = this.formBuilder.group({
    stepName: ['', [Validators.required, Validators.maxLength(160)]],
    status: ['Not started' as ProjectStepStatus, Validators.required]
  });
  protected readonly project = toSignal(
    this.projectId
      ? docData(doc(this.firestore, 'projects', this.projectId), { idField: 'id' }).pipe(
          map((document) => {
            this.isLoadingProject.set(false);
            this.loadError.set(null);

            if (!document) {
              this.loadError.set('Project not found.');
              return null;
            }

            return this.mapProjectRecord(document as FirebaseProjectDocument);
          }),
          catchError(() => {
            this.isLoadingProject.set(false);
            this.loadError.set('Project could not be loaded from Firebase.');
            return of(null);
          })
        )
      : of(null),
    { initialValue: null as ProjectRecord | null }
  );

  constructor() {
    if (!this.projectId) {
      this.isLoadingProject.set(false);
      this.loadError.set('Project ID is missing.');
    }

    effect(() => {
      const project = this.project();

      if (!project) {
        return;
      }

      this.saveError.set(null);
    });
  }

  protected async submitStep(): Promise<void> {
    if (!this.projectId) {
      return;
    }

    const project = this.project();

    if (!project) {
      return;
    }

    if (this.stepForm.invalid) {
      this.stepForm.markAllAsTouched();
      return;
    }

    if (this.isSavingStep()) {
      return;
    }

    this.isSavingStep.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(null);

    const payload = this.stepForm.getRawValue() as {
      stepName: string;
      status: ProjectStepStatus;
    };
    const nextStep: ProjectStep = {
      name: payload.stepName.trim(),
      status: payload.status
    };

    try {
      await updateDoc(doc(this.firestore, 'projects', this.projectId), {
        steps: [...project.steps, nextStep]
      });

      this.saveSuccess.set('Project step added successfully.');
      this.queueSuccessMessageDismissal();
      this.stepForm.reset({
        stepName: '',
        status: 'Not started'
      });
      this.stepForm.markAsPristine();
      this.stepForm.markAsUntouched();
    } catch {
      this.saveError.set('The project step could not be saved to Firebase. Please try again.');
    } finally {
      this.isSavingStep.set(false);
    }
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

  private mapProjectRecord(document: FirebaseProjectDocument): ProjectRecord {
    return {
      id: document.id,
      title: document.title?.trim() || 'Untitled project',
      owner: document.owner?.trim() || 'Unassigned',
      projectBrief:
        document.projectBrief?.trim() ||
        document.background?.trim() ||
        document.description?.trim() ||
        'No project brief provided.',
      steps: (document.steps ?? [])
        .map((step) => this.mapProjectStep(step))
        .filter((step): step is ProjectStep => step !== null),
      dueDate: document.dueDate?.trim() || 'Not set',
      createdAt: this.formatCreatedAt(document.createdAt)
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

  private queueSuccessMessageDismissal(): void {
    if (this.successMessageTimeoutId !== null) {
      window.clearTimeout(this.successMessageTimeoutId);
    }

    this.successMessageTimeoutId = window.setTimeout(() => {
      this.saveSuccess.set(null);
      this.successMessageTimeoutId = null;
    }, 4000);
  }
}