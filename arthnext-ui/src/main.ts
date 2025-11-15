import { bootstrapApplication } from '@angular/platform-browser'
import { appConfig } from './app/app.config'
import { AppComponent } from './app/app.component'

// Ensure pdf.js is imported and set up globally
import * as pdfjsLib from 'pdfjs-dist';

// Set the PDF.js worker globally
pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.394/pdf.worker.min.js';


bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err))
