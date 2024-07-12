const USER_STORE = [];
import i18n from "../i18n/i18n.js";

function createUser(id, name, room) {
  const existingUser = USER_STORE.find((user) => user.name === name);

  if (existingUser) {
    return { error: i18n.__("Username has already been taken") };
  }
  if (!name && !room) {
    return { error: i18n.__("Username and Room are required") };
  }
  if (!name || name.length < 3) {
    return { error: i18n.__("Username is required") };
  }
  if (!room) {
    return { error: i18n.__("Room is required") };
  }

  const user = { id, name, room };
  USER_STORE.push(user);

  return { user };
}

function fetchUser(id) {
  return USER_STORE.find((user) => user.id === id);
}

function deleteUser(id) {
  const foundIndex = USER_STORE.findIndex((user) => user.id === id);
  if (foundIndex > -1) {
    return USER_STORE.splice(foundIndex, 1)[0];
  }
  return null;
}

function fetchUsersInRoom(room) {
  return USER_STORE.filter((user) => user.room.id === room.id);
}

const store = {
  createUser,
  fetchUser,
  deleteUser,
  fetchUsersInRoom
};

export default store;
