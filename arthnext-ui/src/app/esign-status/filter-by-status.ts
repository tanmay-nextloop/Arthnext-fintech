import { Pipe, PipeTransform } from '@angular/core';

interface Signer {
  id: string;
  name: string;
  status: 'pending' | 'signed' | 'rejected';
}

@Pipe({
  name: 'filterByStatus',
  standalone: true
})
export class FilterByStatusPipe implements PipeTransform {
  transform(signers: Signer[], status: string): Signer[] {
    if (!signers || !status) {
      return signers;
    }
    return signers.filter(signer => signer.status === status);
  }
}