// src/types/navigation.ts
export type RootStackParamList = {
  Home: undefined;
  Profile: { userId: string };
  Comments: { postId: string };
  Post: { postId: string };
};
