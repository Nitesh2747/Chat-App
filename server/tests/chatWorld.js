import { createUser, as, makeFriends } from './helpers.js';
import { connectSocket, waitForRoom } from './socketHelpers.js';

// A ready-made scene: alice and bob are friends with a DM, both are connected.
// carol is a registered stranger (not connected).
export async function createChatWorld() {
  const alice = await createUser('alice');
  const bob = await createUser('bob');
  const carol = await createUser('carol');
  await makeFriends(alice, bob);

  const dm = await as(alice).post('/api/conversations/dm').send({ userId: bob.id });
  const convoId = dm.body._id;

  const aliceSocket = await connectSocket(alice);
  const bobSocket = await connectSocket(bob);
  await waitForRoom(convoId, 2);

  return { alice, bob, carol, convoId, aliceSocket, bobSocket };
}