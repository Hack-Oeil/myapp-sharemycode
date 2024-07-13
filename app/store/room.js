const ROOM_STORE = [];

function createRoom(id, owner, mode) {

    const room = { id, owner, mode };
    ROOM_STORE.push(room);

    return room;
}

function fetchRoom(id) {
  return ROOM_STORE.find((room) => room.id === id);
}

function deleteRoom(id) {
  const foundIndex = ROOM_STORE.findIndex((room) => room.id === id);
  if (foundIndex > -1) {
    return ROOM_STORE.splice(foundIndex, 1)[0];
  }
  return null;
}

function fetchRoomsInRoom(realRoom) {
  return ROOM_STORE.filter((room) => room.id === realRoom.id);
}

const store = {
  createRoom,
  fetchRoom,
  deleteRoom,
  fetchRoomsInRoom
};

export default store;
