import { Server } from "socket.io";
import userStore from "./store/user.js";
import roomStore from "./store/room.js";
import editorStore from "./store/editor.js";

export default async (server, i18n) => {
    const io = new Server(server);

    // Chargement des rooms existantes
    const editors = await editorStore.load();
    // On génére les rooms existantes
    editors.forEach((editor) => {
      console.log(editor);
      roomStore.createRoom(editor.roomData.name, editor.roomData.owner);
    });

    io.on("connection", (socket) => {
        // Quand un utilisateur rejoint
        socket.on("join", ({ name, room }, callback) => {
          let realRoom = roomStore.fetchRoom(room);

          if(realRoom == undefined) {
            realRoom = roomStore.createRoom(room, name);
            socket.emit('userRommOwner', room);
          }
        
          const { user, error } = userStore.createUser(socket.id, name, realRoom);
          if (error) {
            return callback(error);
          }
          const usersInRoom = userStore.fetchUsersInRoom(realRoom);
          socket.join(user.room.id);

          // Si cette salle existe déjà
          const currentEditor = editors.find(item => item.name === user.room.id);
          if (currentEditor) { 
            (async () => {
              // On envoi le code actuel du salon à l'utilisateur et le langage à associer
              socket.emit("codeChange", await editorStore.content(currentEditor));
              if(currentEditor.roomData && currentEditor.roomData.mode) {
                socket.emit("langChange", { room, lang : currentEditor.roomData.mode});
              }
              // Si l'utilisateur courant était le propriétaire de cet editor
              if(currentEditor.roomData && currentEditor.roomData.owner && currentEditor.roomData.owner === user.name) {
                socket.emit('userRommOwner', user.room.id);
              }
            })();
          } else {
            editorStore.createSaveEditor(room, user.name);
          }
          
          socket.in(room).emit("notification", i18n.__('{{name}} just entered the room', {name: user.name}));
          io.in(room).emit("usersChange", usersInRoom);
          return callback();
        });
      
        // Quand on recoit un message de discussion
        socket.on("chatMessage", (message) => {
          const user = userStore.fetchUser(socket.id);
          if (user) {
            socket
              .in(user.room.id)
              .emit("chatMessage", { username: user.name, message });
          }
        });
      
        // Quand on reccoit un code (content) modifié
        socket.on("codeChange", (code) => {
          const user = userStore.fetchUser(socket.id);
          if (user && user.room.owner === user.name) {
            // Enregistrement du content pour sauvegarde
            const currentEditor = editors.find(item => item.name === user.room.id);
            if (currentEditor) { editorStore.saveContent(currentEditor, code); }
            // Envoi du contenu à tout le monde
            socket.in(user.room.id).emit("codeChange", code);
          }
        });
      
        // Quand on recoit le changement de language pour un editor
        socket.on("langChange", ({ name, lang }) => {
          const user = userStore.fetchUser(socket.id);
          if (user && user.room.owner === user.name) {
            const currentEditor = editors.find(item => item.name === user.room.id);
            if (currentEditor) { editorStore.saveLang(currentEditor, lang); }

            socket
              .in(user.room.id)
              .emit("notification", i18n.__('User {{name}} changed language to {{language}}', {name: user.name, language:name}));
            socket.in(user.room.id).emit("langChange", { name, lang });
          }
        });

        // Quand un utilisateur se deconnecte
        socket.on("disconnect", () => {
          const user = userStore.deleteUser(socket.id);
          if (user) {
            const usersInRoom = userStore.fetchUsersInRoom(user.room.id);
            io.in(user.room).emit("notification", i18n.__('{{name}} just left the room', {name: user.name}) );
            io.in(user.room).emit("usersChange", usersInRoom);
          }
        });
    });
}