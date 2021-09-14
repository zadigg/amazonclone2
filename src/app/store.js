import { configureStore } from "@reduxjs/toolkit";
import basketReducer from "../slices/basketSlice";

// The global store setup
export const store = configureStore({
  reducer: {
    basket: basketReducer,
  },
});
