import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Firestore, doc, docData, updateDoc } from '@angular/fire/firestore';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';

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
  dueDate?: string;
  createdAt?: FirebaseTimestampLike | Date | null;
}

interface ProjectRecord {
  id: string;
  title: string;
  owner: string;
  projectBrief: string;
  dueDate: string;
  createdAt: string;
}

@Component({
  selector: 'app-edit-project-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './edit-project.html'
})
export class EditProjectPage {
  private readonly route = inject(ActivatedRoute);
  private readonly firestore = inject(Firestore);
  private readonly formBuilder = new FormBuilder();
  private successMessageTimeoutId: number | null = null;
  private readonly projectId = this.route.snapshot.paramMap.get('id');

  protected readonly isLoadingProject = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly isSavingProject = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saveSuccess = signal<string | null>(null);
  protected readonly projectForm = this.formBuilder.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    owner: ['', [Validators.required, Validators.maxLength(120)]],
    projectBrief: ['', [Validators.required, Validators.maxLength(240)]],
    dueDate: ['', Validators.required]
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

      this.projectForm.reset({
        title: project.title,
        owner: project.owner,
        projectBrief: project.projectBrief,
        dueDate: project.dueDate
      });
      this.projectForm.markAsPristine();
      this.projectForm.markAsUntouched();
    });
  }

  protected syncDueDate(event: Event): void {
    const dueDateValue = (event.target as HTMLInputElement | null)?.value ?? '';

    this.projectForm.controls.dueDate.setValue(dueDateValue);
    this.projectForm.controls.dueDate.updateValueAndValidity();
  }

  protected async submitProject(): Promise<void> {
    if (!this.projectId) {
      return;
    }

    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    if (this.isSavingProject()) {
      return;
    }

    this.isSavingProject.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(null);

    const payload = this.projectForm.getRawValue() as {
      title: string;
      owner: string;
      projectBrief: string;
      dueDate: string;
    };

    try {
      await updateDoc(doc(this.firestore, 'projects', this.projectId), payload);
      this.saveSuccess.set('Project updated successfully.');
      this.queueSuccessMessageDismissal();
      this.projectForm.markAsPristine();
      this.projectForm.markAsUntouched();
    } catch {
      this.saveError.set('The project could not be updated in Firebase. Please try again.');
    } finally {
      this.isSavingProject.set(false);
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
      dueDate: document.dueDate?.trim() || 'Not set',
      createdAt: this.formatCreatedAt(document.createdAt)
    };
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