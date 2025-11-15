// import { Component, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { HttpClient, HttpClientModule } from '@angular/common/http';
// import { ActivatedRoute, Router } from '@angular/router';
// import { FilterByStatusPipe } from './filter-by-status';

// interface Signer {
//   id: string;
//   name: string;
//   status: 'pending' | 'signed' | 'rejected';
// }

// interface ESignStatus {
//   esignId: string;
//   status: 'in_progress' | 'completed' | 'rejected';
//   signers: Signer[];
//   nextPendingSigner: Signer | null;
// }

// @Component({
//   selector: 'app-esign-status',
//   standalone: true,
//   imports: [CommonModule, HttpClientModule],
//   templateUrl: './esign-status.component.html',
//   styleUrls: ['./esign-status.component.scss']
// })
// export class EsignStatusComponent implements OnInit {
//   esignId: string = '';
//   statusData: ESignStatus | null = null;
//   loading = false;
//   error = '';

//   // API endpointshttp://192.168.0.165:3000/api/v1/esign/getStatus/2b4f75ac-f1ba-4b27-afaa-903a0f497841
//   // getStatusApiEndpoint = `https://peakily-idioplasmatic-kimbra.ngrok-free.dev/api/v1/esign/getStatus/` ; // Replace with actual endpoint
//   verifyApiEndpoint = 'https://peakily-idioplasmatic-kimbra.ngrok-free.dev/api/v1/esign/proceedNext/'; // Replace with actual endpoint
//   // getStatusApiEndpoint = `http://192.168.0.165:3000/api/v1/esign/getStatus/`;

//     getStatusApiEndpoint = `https://peakily-idioplasmatic-kimbra.ngrok-free.dev/api/v1/esign/getStatus/`;
//   constructor(
//     private http: HttpClient,
//     private route: ActivatedRoute,
//     private router: Router
//   ) { }

//   ngOnInit() {
//     // Get esignId from route params or query params
//     this.route.queryParams.subscribe(params => {
//       this.esignId = params['esignId'];
//       if (this.esignId) {
//         this.fetchStatus();
//       }
//     });
//   }

//   async fetchStatus() {
//     if (!this.esignId) {
//       this.error = 'No eSign ID provided';
//       return;
//     }

//     this.loading = true;
//     this.error = '';

//     try {
//       const response = await this.http.post<ESignStatus>(
//         `${this.getStatusApiEndpoint}${this.esignId}`,{}
//       ).toPromise();

//       this.statusData = response || null;
//       console.log('Status Data:', this.statusData);
//     } catch (err: any) {
//       console.error('Error fetching status:', err);
//       this.error = err.message || 'Failed to fetch eSign status';
//     } finally {
//       this.loading = false;
//     }
//   }

//   async verifySignature(signer: Signer) {
//     if (signer.status !== 'pending') {
//       alert('This signer has already completed their action.');
//       return;
//     }

//     const confirmed = confirm(`Verify signature for ${signer.name}?`);
//     if (!confirmed) return;

//     this.loading = true;

//     try {
//       const payload = {
//         // esignId: this.esignId,
//         // signerId: signer.id
//       };

//       // const response = await this.http.post(
//       //   this.verifyApiEndpoint+this.esignId,
//       //   payload
//       // ).toPromise();
//       this.http
//         .post(this.verifyApiEndpoint+this.esignId, {})
//         .subscribe({
//           next: (res: any) => {
//             console.log('✅ Success:', res);
//             const tab1 = window.open('', '_blank');
//             if (res?.esignUrl) {
//               if (!tab1) {
//                 // alert('Popup Blocked', 'Popup blocked! Please allow popups for this site.', 'error');
//                 return;
//               }
//               tab1.location.href = res.esignUrl;
//               tab1.document.body.innerHTML += `
//               <p><a href="${res.esignUrl}" target="_blank">Click here if not redirected</a></p>
//             `;
//             } else {
//             }
//           },
//           error: (err) => {
//             console.error('❌ Error:', err);
//           }
//         });

//       // console.log('Verify Response:', res);
//       // alert(`Verification initiated for ${signer.name}`);

//       // Refresh status after verification
//       await this.fetchStatus();
//     } catch (err: any) {
//       console.error('Error verifying signature:', err);
//       alert(`Failed to verify: ${err.message || 'Unknown error'}`);
//     } finally {
//       this.loading = false;
//     }
//   }

//   getStatusClass(status: string): string {
//     switch (status) {
//       case 'pending':
//         return 'status-pending';
//       case 'signed':
//         return 'status-signed';
//       case 'rejected':
//         return 'status-rejected';
//       case 'in_progress':
//         return 'status-in-progress';
//       case 'completed':
//         return 'status-completed';
//       default:
//         return '';
//     }
//   }

//   getStatusIcon(status: string): string {
//     switch (status) {
//       case 'pending':
//         return '⏳';
//       case 'signed':
//         return '✅';
//       case 'rejected':
//         return '❌';
//       case 'in_progress':
//         return '🔄';
//       case 'completed':
//         return '🎉';
//       default:
//         return '📄';
//     }
//   }

//   goBack() {
//     this.router.navigate(['/multisign']);
//   }

//   refreshStatus() {
//     this.fetchStatus();
//   }
// }
















// import { Component, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { ActivatedRoute, Router } from '@angular/router';

// interface Signer {
//   id: string;
//   name: string;
//   status: 'pending' | 'signed' | 'rejected';
// }

// interface ESignStatus {
//   esignId: string;
//   status: 'in_progress' | 'completed' | 'rejected';
//   signers: Signer[];
//   nextPendingSigner: Signer | null;
// }

// @Component({
//   selector: 'app-esign-status',
//   standalone: true,
//   imports: [CommonModule],
//   templateUrl: './esign-status.component.html',
//   styleUrls: ['./esign-status.component.scss']
// })
// export class EsignStatusComponent implements OnInit {
//   esignId: string = '';
//   statusData: ESignStatus | null = null;
//   loading = false;
//   error = '';

//   constructor(
//     private route: ActivatedRoute,
//     private router: Router
//   ) {}

//   ngOnInit() {
//     // Get esignId from route params or query params
//     this.route.queryParams.subscribe(params => {
//       this.esignId = params['esignId'] || 'DEMO123'; // fallback hardcoded ID
//       this.fetchStatus(); // use hardcoded data
//     });
//   }

//   // Simulate API call with hardcoded data
//   async fetchStatus() {
//     this.loading = true;
//     this.error = '';

//     try {
//       // Simulated delay (optional)
//       await new Promise(res => setTimeout(res, 500));

//       // Hardcoded eSign status data
//       this.statusData = {
//         esignId: this.esignId,
//         status: 'in_progress',
//         signers: [
//           { id: '1', name: 'Tanmay Saxena', status: 'signed' },
//           { id: '2', name: 'Ishika Sahu', status: 'pending' },
//           { id: '3', name: 'Pritesh', status: 'pending' }
//         ],
//         nextPendingSigner: { id: '2', name: 'Ishika', status: 'pending' }
//       };

//       console.log('Mock Status Data:', this.statusData);
//     } catch (err: any) {
//       console.error('Error fetching mock status:', err);
//       this.error = 'Failed to load mock data';
//     } finally {
//       this.loading = false;
//     }
//   }

//   // Simulate verification action
//   async verifySignature(signer: Signer) {
//     if (signer.status !== 'pending') {
//       alert('This signer has already completed their action.');
//       return;
//     }

//     const confirmed = confirm(`Simulate verification for ${signer.name}?`);
//     if (!confirmed) return;

//     this.loading = true;

//     try {
//       // Simulate delay and mock verification
//       await new Promise(res => setTimeout(res, 800));

//       // Update signer status in mock data
//       signer.status = 'signed';

//       // Check if all signers are done
//       const allSigned = this.statusData?.signers.every(s => s.status === 'signed');
//       if (this.statusData) {
//         this.statusData.status = allSigned ? 'completed' : 'in_progress';
//         this.statusData.nextPendingSigner = this.statusData.signers.find(s => s.status === 'pending') || null;
//       }

//       alert(`Mock verification completed for ${signer.name}`);
//     } catch (err: any) {
//       console.error('Error verifying mock signature:', err);
//       alert('Mock verification failed');
//     } finally {
//       this.loading = false;
//     }
//   }

//   getStatusClass(status: string): string {
//     switch (status) {
//       case 'pending': return 'status-pending';
//       case 'signed': return 'status-signed';
//       case 'rejected': return 'status-rejected';
//       case 'in_progress': return 'status-in-progress';
//       case 'completed': return 'status-completed';
//       default: return '';
//     }
//   }

//   getStatusIcon(status: string): string {
//     switch (status) {
//       case 'pending': return '⏳';
//       case 'signed': return '✅';
//       case 'rejected': return '❌';
//       case 'in_progress': return '🔄';
//       case 'completed': return '🎉';
//       default: return '📄';
//     }
//   }

//   goBack() {
//     this.router.navigate(['/multisign']);
//   }

//   refreshStatus() {
//     this.fetchStatus();
//   }
// }














import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

interface Signer {
  id: string;
  name: string;
  status: 'pending' | 'signed' | 'rejected';
}

interface ESignStatus {
  esignId: string;
  status: 'in_progress' | 'completed' | 'rejected';
  signers: Signer[];
  nextPendingSigner: Signer | null;
}

@Component({
  selector: 'app-esign-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './esign-status.component.html',
  styleUrls: ['./esign-status.component.scss']
})
export class EsignStatusComponent implements OnInit {
  esignId: string = '';
  statusData: ESignStatus | null = null;
  loading = false;
  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) { }
  ngOnInit() {
    // Hardcoded esignId
    this.esignId = '2b4f75ac-f1ba-4b27-afaa-903a0f497841';
    this.fetchStatus();
  }

  // Simulate fetching status with hardcoded data
  fetchStatus() {
    this.loading = true;

    // Simulated delay (optional)
    setTimeout(() => {
      this.statusData = {
        esignId: this.esignId,
        status: 'in_progress',
        signers: [
          { id: '3b895d1d-98cb-450a-a40e-345f6344d4ea', name: 'Tanmay Saxena', status: 'pending' },
          { id: '422617eb-04f9-480c-a119-56cd2e555bf2', name: 'Priesh', status: 'pending' },
          { id: 'bd6de1fd-296d-4ec2-a358-cd74b83e7c11', name: 'Ishika Sahu', status: 'pending' }
        ],
        nextPendingSigner: {
          id: 'bd6de1fd-296d-4ec2-a358-cd74b83e7c11',
          name: 'Ishika Sahu',
          status: 'pending'
        }
      };
      this.loading = false;
    }, 300);
  }

  // Simulate verifying a signature
  verifySignature(signer: Signer) {
    if (signer.status !== 'pending') {
      alert('This signer has already completed their action.');
      return;
    }

    const confirmed = confirm(`Verify signature for ${signer.name}?`);
    if (!confirmed) return;

    this.loading = true;

    setTimeout(() => {
      // Update signer status
      signer.status = 'signed';

      // Update nextPendingSigner
      if (this.statusData) {
        const nextSigner = this.statusData.signers.find(s => s.status === 'pending') || null;
        this.statusData.nextPendingSigner = nextSigner;

        // Update overall status
        this.statusData.status = this.statusData.signers.every(s => s.status === 'signed') 
          ? 'completed' 
          : 'in_progress';
      }

      alert(`Signature verified for ${signer.name}`);
      this.loading = false;
    }, 500);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'signed': return 'status-signed';
      case 'rejected': return 'status-rejected';
      case 'in_progress': return 'status-in-progress';
      case 'completed': return 'status-completed';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'pending': return '⏳';
      case 'signed': return '✅';
      case 'rejected': return '❌';
      case 'in_progress': return '🔄';
      case 'completed': return '🎉';
      default: return '📄';
    }
  }

  refreshStatus() {
    this.fetchStatus();
  }

    goBack() {
    this.router.navigate(['/multisign']);
  }
}
