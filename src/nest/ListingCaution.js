import React, {useState} from 'react';
import {Pressable, View, Text} from 'react-native';
import {Feather} from '@expo/vector-icons';

export default function ListingCaution({listing}) {
  const [open, setOpen] = useState(false);
  const caution = listing?.caution;
  if (!caution?.suspicious || !caution.reasons?.length) return null;
  return <View style={{alignSelf:'center', maxWidth:'100%', marginVertical:4}}>
    <Pressable accessibilityRole="button" accessibilityLabel="Listing caution: Muse detected warning signs. Show details" accessibilityState={{expanded:open}}
      onPress={event=>{event.stopPropagation();setOpen(!open);}}
      style={{minHeight:36,minWidth:36,alignSelf:'center',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,paddingHorizontal:8,borderRadius:12,backgroundColor:'#FFF4D6'}}>
      <Feather name="alert-triangle" size={16} color="#8A5700" />
      <Text style={{fontSize:12,color:'#8A5700',fontWeight:'600'}}>Caution</Text>
    </Pressable>
    {open && <View style={{padding:10,borderRadius:10,backgroundColor:'#FFF4D6'}}>
      <Text style={{fontSize:12,color:'#704700'}}>Muse flagged possible warning signs. This does not prove fraud.</Text>
      {caution.reasons.map((item,i)=><View key={i} style={{marginTop:6}}>
        <Text style={{fontSize:12,color:'#704700'}}>{item.reason}</Text>
        <Text style={{fontSize:12,color:'#704700',fontStyle:'italic'}}>“{item.quote}”</Text>
      </View>)}
    </View>}
  </View>;
}
