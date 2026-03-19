import { Component, inject, signal } from '@angular/core';
import { Firestore, addDoc, collection, serverTimestamp } from '@angular/fire/firestore';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface NewProjectPayload {
  title: string;
  owner: string;
  projectBrief: string;
  dueDate: string;
}

interface SavedProjectPayload extends NewProjectPayload {
  id: string;
}

@Component({
  selector: 'app-new-project-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './new-project.html'
})
export class NewProjectPage {
  private readonly formBuilder = new FormBuilder();
  private readonly firestore = inject(Firestore);
  private successMessageTimeoutId: number | null = null;

  protected readonly projectForm = this.formBuilder.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    owner: ['', [Validators.required, Validators.maxLength(120)]],
    projectBrief: ['', [Validators.required, Validators.maxLength(240)]],
    dueDate: ['', Validators.required]
  });
  protected readonly isSavingProject = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saveSuccess = signal<string | null>(null);
  protected readonly submittedProject = signal<SavedProjectPayload | null>(null);

  protected syncDueDate(event: Event): void {
    const dueDateValue = (event.target as HTMLInputElement | null)?.value ?? '';

    this.projectForm.controls.dueDate.setValue(dueDateValue);
    this.projectForm.controls.dueDate.updateValueAndValidity();
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

  protected async submitProject(): Promise<void> {
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

    const payload = this.projectForm.getRawValue() as NewProjectPayload;

    try {
      const projectDocument = await addDoc(collection(this.firestore, 'projects'), {
        ...payload,
        createdAt: serverTimestamp()
      });

      this.submittedProject.set({
        id: projectDocument.id,
        ...payload
      });
      this.saveSuccess.set('Project saved to Firebase successfully.');
      this.queueSuccessMessageDismissal();
      this.projectForm.reset({
        title: '',
        owner: '',
        projectBrief: '',
        dueDate: ''
      });
      this.projectForm.markAsPristine();
      this.projectForm.markAsUntouched();
    } catch {
      this.saveError.set('The project could not be saved to Firebase. Please try again.');
    } finally {
      this.isSavingProject.set(false);
    }
  }
}