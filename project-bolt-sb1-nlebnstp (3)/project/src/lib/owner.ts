const OWNER_ID = '9355def1-4bc7-4f8a-a4bf-130265ab29e1';

export function isOwner(userId?: string | null): boolean {
  return !!userId && userId === OWNER_ID;
}

export function ownerNameClass(userId?: string | null): string {
  return isOwner(userId) ? 'owner-name' : '';
}
