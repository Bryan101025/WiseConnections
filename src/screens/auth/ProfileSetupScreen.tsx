import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { supabase } from '../../config/supabase';

const ProfileSetupScreen = ({ navigation }) => {
 const [firstName, setFirstName] = useState('');
 const [lastName, setLastName] = useState('');

 const handleCompleteSetup = async () => {
   try {
     const { data, error } = await supabase.auth.getSession();
     console.log('Session:', data);
     
     if (!data.session?.user) throw new Error('No user found');

     const { error: profileError } = await supabase
       .from('profiles')
       .insert([{
         user_id: data.session.user.id,
         first_name: firstName,
         last_name: lastName,
         created_at: new Date()
       }]);

     if (profileError) throw profileError;
     navigation.navigate('MainApp');
     
   } catch (error) {
     Alert.alert('Error', error.message);
   }
 };

 return (
   <View style={styles.container}>
     <Text style={styles.title}>Complete Your Profile</Text>
     <Text style={styles.subtitle}>
       Tell us about yourself to connect with like-minded retirees
     </Text>

     <TextInput
       style={styles.input}
       placeholder="First Name"
       value={firstName}
       onChangeText={setFirstName}
     />

     <TextInput
       style={styles.input}
       placeholder="Last Name"
       value={lastName}
       onChangeText={setLastName}
     />

     <TouchableOpacity 
       style={styles.button}
       onPress={handleCompleteSetup}
     >
       <Text style={styles.buttonText}>Complete Profile Setup</Text>
     </TouchableOpacity>
   </View>
 );
};

const styles = StyleSheet.create({
 container: {
   flex: 1,
   padding: 20,
   backgroundColor: '#fff',
 },
 title: {
   fontSize: 28,
   fontWeight: 'bold',
   textAlign: 'center',
   marginBottom: 10,
 },
 subtitle: {
   fontSize: 16,
   color: '#666',
   textAlign: 'center',
   marginBottom: 30,
 },
 input: {
   borderWidth: 1,
   borderColor: '#ddd',
   borderRadius: 8,
   padding: 15,
   marginBottom: 15,
   fontSize: 16,
 },
 button: {
   backgroundColor: '#4B9CD3',
   padding: 15,
   borderRadius: 8,
   marginTop: 20,
 },
 buttonText: {
   color: '#fff',
   textAlign: 'center',
   fontSize: 16,
   fontWeight: '600',
 },
});

export default ProfileSetupScreen;