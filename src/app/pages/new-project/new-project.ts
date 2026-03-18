import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface NewProjectPayload {
  title: string;
  owner: string;
  description: string;
  dueDate: string;
}

@Component({
  selector: 'app-new-project-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './new-project.html'
})
export class NewProjectPage {
  private readonly formBuilder = new FormBuilder();

  protected readonly projectForm = this.formBuilder.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    owner: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(2000)]],
    dueDate: ['', Validators.required]
  });
  protected readonly submittedProject = signal<NewProjectPayload | null>(null);

  protected submitProject(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    this.submittedProject.set(this.projectForm.getRawValue() as NewProjectPayload);
  }
}