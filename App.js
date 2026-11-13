import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, Image, Pressable, StatusBar, Dimensions, ActivityIndicator, Modal, Animated, PanResponder } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as api from './src/api';
import Nest from './src/nest/Nest';

const BLUE = '#0866ff';
const W = Dimensions.get('window').width;
const BLANK = 'https://i.pravatar.cc/150?img=12';

// ---- helpers --------------------------------------------------------------
const timeAgo = (iso) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d}d` : `${Math.round(d / 7)}w`;
};
const shortDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const money = (n) => (n == null || Number(n) === 0 ? 'Free' : `$${Number(n)}`);
const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : `${n}`);

// Loads data on mount / when deps change. `reload` refetches without a spinner flash.
function useData(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const load = useCallback(() => {
    let live = true;
    fn().then((data) => live && setState({ data, error: null, loading: false }))
      .catch((error) => live && setState({ data: null, error, loading: false }));
    return () => { live = false; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);
  return { ...state, reload: load };
}

// Shows a spinner / error, otherwise renders children(data).
const Loaded = ({ q, children }) => {
  if (q.loading) return <ActivityIndicator style={{ margin: 40 }} color={BLUE} />;
  if (q.error) return <Text style={x.error}>Couldn’t load data.{`\n`}{q.error.message}</Text>;
  return children(q.data);
};

// ---- shared UI ------------------------------------------------------------
const IconButton = ({ name, family='ion', onPress, badge }) => (
  <Pressable onPress={onPress} style={({pressed})=>[s.iconBtn, pressed&&s.pressed]}>
    {family==='feather'?<Feather name={name} size={24}/>:<Ionicons name={name} size={25}/>}
    {badge ? <View style={s.badge}><Text style={s.badgeText}>{badge}</Text></View> : null}
  </Pressable>
);

const Header = ({title, logo, right, back, onBack, onMenu}) => <View style={s.header}>
  <View style={s.headerLeft}>{back && <Pressable onPress={onBack}><Ionicons name="chevron-back" size={27}/></Pressable>}{!back&&<Pressable accessibilityRole="button" accessibilityLabel="Open Facebook menu" onPress={onMenu} hitSlop={10}><Ionicons name="menu" size={27}/></Pressable>}<Text style={[s.headerTitle,logo&&s.logo]}>{title}</Text></View>
  <View style={s.headerRight}>{right}</View>
</View>;

const Nav = ({tab,setTab}) => {
  const items=[['home','home-outline','Home'],['reels','play-circle-outline','Reels'],['market','storefront-outline','Marketplace'],['groups','people-outline','Groups'],['notify','notifications-outline','Notifications'],['profile','person-circle-outline','Profile']];
  return <View style={s.nav}>{items.map(([key,icon,label])=><Pressable key={key} onPress={()=>setTab(key)} style={s.navItem}>
    <View style={[s.navTop,tab===key&&s.navActive]}><Ionicons name={tab===key?icon.replace('-outline',''):icon} size={23} color={tab===key?BLUE:'#111'}/></View><Text style={[s.navText,tab===key&&{color:BLUE}]}>{label}</Text>
  </Pressable>)}</View>
};

// ---- posts ----------------------------------------------------------------
function Post({ post }) {
  const [liked, setLiked] = useState(post.liked);
  const [count, setCount] = useState(post.reaction_count);
  const [expanded, setExpanded] = useState(false);
  const long = post.body.length > 140;
  const toggleLike = () => {
    const next = !liked;
    setLiked(next); setCount((c) => c + (next ? 1 : -1)); // optimistic
    api.setLike(post.id, next).catch(() => { setLiked(!next); setCount((c) => c + (next ? -1 : 1)); });
  };
  return <View style={s.post}>
    <View style={s.postHead}><Image source={{uri:post.author.avatar_url||BLANK}} style={s.avatar}/><View style={{flex:1}}><Text style={s.bold}>{post.group?.name || post.author.name}</Text><Text style={s.muted}>{post.group ? `${post.author.name} · ` : ''}{timeAgo(post.created_at)} · 🌐</Text></View><Ionicons name="ellipsis-horizontal" size={23}/><Ionicons name="close" size={26} color="#66717d"/></View>
    {post.title ? <Text style={s.postTitle}>{post.title}</Text> : null}
    <Text style={[s.body, !post.title && {paddingTop:10}]}>{long&&!expanded?post.body.slice(0,140)+'... ':post.body}{long&&!expanded&&<Text style={s.muted} onPress={()=>setExpanded(true)}>See more</Text>}</Text>
    {post.images.length>0&&<View style={s.photoGrid}>{post.images.slice(0,2).map((u)=><Image key={u} source={{uri:u}} style={s.postPhoto}/>)}</View>}
    <View style={s.actions}><Text>{count>0?`👍 ❤️  ${count}`:' '}</Text><Text style={s.muted}>{post.comment_count} comments · {post.share_count} shares</Text></View>
    <View style={s.actionRow}>
      <Pressable style={s.action} onPress={toggleLike}><Ionicons name={liked?'thumbs-up':'thumbs-up-outline'} size={20} color={liked?BLUE:'#111'}/><Text style={liked&&{color:BLUE,fontWeight:'600'}}>Like</Text></Pressable>
      {[['chatbubble-outline','Comment'],['arrow-redo-outline','Share']].map(y=><View key={y[1]} style={s.action}><Ionicons name={y[0]} size={20}/><Text>{y[1]}</Text></View>)}
    </View>
  </View>;
}

const Posts = ({ q }) => <Loaded q={q}>{(posts) => posts.length ? posts.map((p) => <Post key={p.id} post={p}/>) : <Text style={x.empty}>Nothing here yet.</Text>}</Loaded>;

// ---- screens --------------------------------------------------------------
function Home({openMenu}){
  const me = useData(api.getMe);
  const stories = useData(api.getStories);
  const feed = useData(() => api.getFeed(20));
  return <ScrollView showsVerticalScrollIndicator={false} style={s.page}>
    <Header logo title="facebook" onMenu={openMenu} right={<><IconButton name="add"/><IconButton name="search"/><IconButton name="chatbubble-ellipses" badge="4"/></>}/>
    <View style={s.composer}><Image source={{uri:me.data?.avatar_url||BLANK}} style={s.avatar}/><Text style={s.composerText}>What's on your mind?</Text><Ionicons name="images-outline" size={25} color="#59636e"/></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.stories}>
      <View style={s.story}><Image source={{uri:me.data?.avatar_url||BLANK}} style={s.storyImage}/><View style={s.plus}><Ionicons name="add" size={28} color="white"/></View><Text style={s.createStory}>Create{`\n`}story</Text></View>
      {(stories.data||[]).map((st)=><View style={s.story} key={st.id}><Image source={{uri:st.image_url}} style={s.storyFull}/><Image source={{uri:st.author.avatar_url}} style={s.storyAvatar}/><Text style={s.storyName}>{st.author.name}</Text></View>)}
    </ScrollView>
    <Posts q={feed}/>
  </ScrollView>
}

function Marketplace({openInbox}){
  const listings = useData(api.getListings);
  const threads = useData(api.getThreads);
  const unread = (threads.data||[]).filter((t)=>t.unread).length;
  return <ScrollView style={s.page} showsVerticalScrollIndicator={false}>
    <Header title="Marketplace" right={<><IconButton name="chatbubble-ellipses" onPress={openInbox} badge={unread||null}/><IconButton name="search"/><IconButton name="ellipsis-horizontal-circle"/></>}/>
    <View style={s.chips}>{['Sell','Explore','Local','More⌄'].map((t,i)=><Text key={t} style={[s.chip,i===1&&s.chipOn]}>{t}</Text>)}<Ionicons name="location" size={22}/></View>
    <Loaded q={listings}>{(rows)=><View style={s.productGrid}>{rows.map((l)=><Pressable key={l.id} style={s.product}><Image source={{uri:l.image}} style={s.productImg}/><Text numberOfLines={1} style={s.productText}>{money(l.price)} · {l.title}</Text></Pressable>)}</View>}</Loaded>
  </ScrollView>}

function Inbox({onBack}){
  const threads = useData(api.getThreads);
  return <ScrollView style={s.page}><Header back onBack={onBack} title="Marketplace"/>
    <View style={s.notice}><Ionicons name="notifications-off" color={BLUE} size={23}/><View style={{flex:1}}><Text>Notifications are off</Text><Text style={s.small}>Turn on notifications so you never miss a message. <Text style={{color:BLUE}}>Manage settings</Text></Text></View><Ionicons name="close-circle" size={23} color="#68717a"/></View>
    <Loaded q={threads}>{(rows)=>rows.map((t)=><Pressable key={t.id} style={s.thread}><Image source={{uri:t.image}} style={s.threadImg}/><View style={{flex:1}}><Text style={s.threadTitle}>{t.title}</Text><Text numberOfLines={1} style={s.threadSub}>{t.last} <Text style={s.muted}> · {t.at?shortDate(t.at):''}</Text></Text></View>{t.unread&&<View style={s.dot}/>}</Pressable>)}</Loaded>
  </ScrollView>}

function Groups(){
  const [sub,setSub]=useState('For you');
  const mine = useData(api.getMyGroups);
  const groupPosts = useData(async () => {
    const g = await api.getMyGroups();
    return api.getGroupPosts(g.map((x) => x.id), 5);
  });
  return <ScrollView style={s.page} showsVerticalScrollIndicator={false}><Header title="Groups" right={<><IconButton name="add-circle-outline"/><IconButton name="search"/><IconButton name="ellipsis-horizontal-circle"/></>}/>
    <View style={s.subnav}>{['For you','Your groups','Your activity','Discover'].map(t=><Pressable key={t} onPress={()=>setSub(t)}><Text style={[s.subtab,sub===t&&s.subOn]}>{t}</Text></Pressable>)}</View>
    {sub==='Discover'?<Discover/>:sub==='Your activity'?<Activity groupPosts={groupPosts}/>:<>
      <View style={s.sectionTitle}><Text style={s.bold}>Your groups</Text><Text style={{color:BLUE}}>See all</Text></View>
      <Loaded q={mine}>{(rows)=>rows.map((g)=><View key={g.id} style={s.groupRow}><Image source={{uri:g.cover_url}} style={s.groupImg}/><View style={{flex:1}}><Text numberOfLines={1} style={s.groupName}>{g.name}</Text><Text style={s.small}>🔵 {g.privacy==='private'?'Private group':'Public group'}</Text></View><Ionicons name={g.pinned?'pin':'pin-outline'} size={21} color={g.pinned?BLUE:'#68717a'}/></View>)}</Loaded>
      <Text style={[s.bold,{padding:10,fontSize:18}]}>Recent in your groups</Text><Posts q={groupPosts}/></>}
  </ScrollView>}

function Activity({groupPosts}){return <View><View style={s.filterRow}>{['All','Tagged','Commented','Authored'].map((t,i)=><Text key={t} style={[s.filter,i===0&&s.filterOn]}>{t}</Text>)}</View>
  <Loaded q={groupPosts}>{(posts)=><View style={s.activityGrid}>{posts.map((p)=><View key={p.id} style={s.activityCard}><Text numberOfLines={1} style={s.smallBold}>{p.group?.name}</Text><Text numberOfLines={7} style={s.small}>{p.title?`${p.title}\n`:''}{p.body}</Text><Text style={{textAlign:'right'}}>♡ {p.reaction_count}</Text></View>)}</View>}</Loaded></View>}

function Discover(){
  const sug = useData(api.getSuggestedGroups);
  const [joined,setJoined]=useState({});
  const join=(g)=>{setJoined((j)=>({...j,[g.id]:true})); api.joinGroup(g.id).catch(()=>setJoined((j)=>({...j,[g.id]:false})));};
  return <View><Text style={[s.bold,{padding:10,fontSize:18}]}>Suggested for you</Text>
    <Loaded q={sug}>{(rows)=><View style={s.suggestGrid}>{rows.map((g)=><View key={g.id} style={s.suggest}><Image source={{uri:g.cover_url}} style={s.suggestImg}/><Text numberOfLines={1} style={s.bold}>{g.name}</Text><Text style={s.small}>{g.privacy==='private'?'Private':'Public'} group · {compact(g.member_count)} members</Text><Pressable style={[s.join,joined[g.id]&&x.joined]} onPress={()=>!joined[g.id]&&join(g)}><Text style={{color:joined[g.id]?'#111':'white',fontWeight:'600'}}>{joined[g.id]?'Joined':'Join'}</Text></Pressable></View>)}</View>}</Loaded></View>}

function Notifications(){
  const notes = useData(api.getNotifications);
  return <View style={s.page}><Header title="Notifications" right={<><IconButton name="ellipsis-horizontal-circle"/><IconButton name="search"/><IconButton name="chatbubble-ellipses"/></>}/><Text style={[s.bold,{paddingHorizontal:10}]}>New</Text>
    <ScrollView><Loaded q={notes}>{(rows)=>rows.map((n)=><View key={n.id} style={s.note}><Image source={{uri:n.actor?.avatar_url||BLANK}} style={s.noteAvatar}/><Text style={s.noteText}>{n.message} <Text style={s.muted}> · {timeAgo(n.created_at)}</Text></Text><Ionicons name="ellipsis-horizontal" size={21}/></View>)}</Loaded></ScrollView>
    <View style={s.push}><Ionicons name="close"/><Text style={[s.small,{flex:1}]}>Your push notifications are off. Turn them on to stay connected.</Text><Text style={s.turnOn}>Turn on</Text></View></View>}

function Profile(){
  const me = useData(api.getMe);
  const friends = useData(api.getFriends);
  const posts = useData(() => api.getMyPosts(5));
  return <ScrollView style={s.page} showsVerticalScrollIndicator={false}>
    <Loaded q={me}>{(u)=><>
      <View style={s.cover}>{u.cover_url&&<Image source={{uri:u.cover_url}} style={s.coverImg}/>}<View style={s.profileTools}><Ionicons name="menu" size={25} color="white"/><View style={{flex:1}}/><Ionicons name="pencil" size={22} color="white"/><Ionicons name="search" size={24} color="white"/></View><Image source={{uri:u.avatar_url||BLANK}} style={s.profilePic}/></View>
      <Text style={s.profileName}>{u.name}</Text><Text style={s.center}>{friends.data?`${friends.data.length} friends`:' '}</Text>
      <View style={s.profileBtns}><Text style={s.blueBtn}>⊕ Add to story</Text><Text style={s.grayBtn}>✎ Edit profile</Text></View>
      <View style={s.profileTabs}>{['All','Photos','Reels','Memories'].map((t,i)=><Text key={t} style={[s.profileTab,i===0&&s.filterOn]}>{t}</Text>)}</View>
      <View style={s.sectionTitle}><Text style={s.bold}>At a glance</Text><Text style={{color:BLUE}}>See all</Text></View>
      {u.location&&<Text style={s.detail}>⌾  Lives in {u.location}</Text>}
      {u.birthday&&<Text style={s.detail}>♧  Born {new Date(u.birthday+'T00:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</Text>}
    </>}</Loaded>
    <View style={s.sectionTitle}><Text style={s.bold}>Friends</Text><Text style={{color:BLUE}}>See all</Text></View>
    <View style={s.friendRow}>{(friends.data||[]).slice(0,4).map((f)=><View style={s.friend} key={f.id}><Image source={{uri:f.avatar_url}} style={s.friendImg}/><Text style={s.center}>{f.name}</Text><Text style={[s.small,s.center]}>{f.mutual} mutual friends</Text></View>)}</View>
    <Posts q={posts}/>
  </ScrollView>}

function Reels(){
  const reel = useData(api.getReel);
  const r = reel.data;
  return <View style={[s.page,{backgroundColor:'#111'}]}>
    {reel.loading&&<ActivityIndicator style={{marginTop:200}} color="white"/>}
    {r&&<>
      <Image source={{uri:r.thumbnail_url}} style={s.reelBg}/>
      <View style={s.reelText}><Text style={s.reelCaption}>{r.location}</Text><Text style={{color:'white',fontWeight:'600'}}>{r.author.name}  •  Follow</Text><Text style={{color:'white'}}>{r.caption}</Text></View>
      <View style={s.reelActions}>{[['thumbs-up',r.like_count],['chatbubble',r.comment_count],['arrow-redo',r.share_count],['bookmark',r.save_count]].map(([n,c])=><View key={n} style={{alignItems:'center'}}><Ionicons name={n} size={29} color="white"/><Text style={s.reelCount}>{compact(c)}</Text></View>)}</View>
    </>}
    <View style={s.reelTop}><Ionicons name="menu" size={27} color="white"/><Text style={s.reelTitle}>Reels</Text><View style={{flex:1}}/><Ionicons name="search" size={26} color="white"/><Ionicons name="ellipsis-horizontal-circle" size={25} color="white"/></View>
  </View>}

const menuItems = [
  ['Nest','home-outline'],
  ['Saved','bookmark-outline'],['Dating','heart-outline'],['Games','game-controller-outline'],['Meta AI','sparkles-outline'],
  ['Memories','time-outline'],['Avatars','happy-outline'],['Birthdays','gift-outline'],['Chat with AIs','chatbubbles-outline'],
  ['Community Notes','document-text-outline'],['Events','calendar-outline'],['Explore','compass-outline'],['Feeds','logo-rss'],
  ['Finds','pricetag-outline'],['Friends','people-outline'],['Groups','people-circle-outline'],['Marketplace','storefront-outline'],
  ['Messenger Kids','chatbubble-ellipses-outline'],['Pages','flag-outline'],['Pokes','hand-left-outline'],['Reels','play-circle-outline']
];
const settingsItems = [
  ['Settings','settings-outline'],['Privacy Center','lock-closed-outline'],['Time management','time-outline'],['Device requests','home-outline'],
  ['Your Ad Activity','newspaper-outline'],['Orders and payments','card-outline'],['Link history','link-outline'],['Dark mode','moon-outline'],
  ['App language','globe-outline'],['App icon','logo-facebook'],['Cellular data use','phone-portrait-outline']
];

function MenuRow({label,icon,onPress}){return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({pressed})=>[s.menuRow,pressed&&s.menuRowPressed]}><Ionicons name={icon} size={30} color={label==='Nest'?BLUE:undefined}/><View><Text style={s.menuLabel}>{label}</Text>{label==='Nest'&&<Text style={{fontSize:13,color:'#656B73',marginTop:3}}>Find your people. Find your place.</Text>}</View></Pressable>}

function MenuDrawer({visible,onClose,onSelect}){
  const me=useData(api.getMe);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [helpOpen,setHelpOpen]=useState(false);
  const drawerWidth=W*.88;
  const drawerX=useRef(new Animated.Value(-drawerWidth)).current;
  const closeDrawer=()=>Animated.timing(drawerX,{toValue:-drawerWidth,duration:210,useNativeDriver:true}).start(onClose);
  useEffect(()=>{if(visible){drawerX.setValue(-drawerWidth);Animated.spring(drawerX,{toValue:0,useNativeDriver:true,damping:24,stiffness:230,mass:.8}).start();}},[visible]);
  const drag=useRef(PanResponder.create({
    onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>8&&Math.abs(g.dx)>Math.abs(g.dy),
    onPanResponderMove:(_,g)=>drawerX.setValue(Math.min(0,Math.max(-drawerWidth,g.dx))),
    onPanResponderRelease:(_,g)=>{if(g.dx<-70||g.vx<-.65)closeDrawer();else Animated.spring(drawerX,{toValue:0,useNativeDriver:true,damping:22,stiffness:220}).start();}
  })).current;
  return <Modal visible={visible} transparent animationType="none" onRequestClose={closeDrawer} statusBarTranslucent>
    <View style={s.drawerShell}>
      <Pressable style={s.drawerScrim} onPress={closeDrawer}/>
      <Animated.View style={[s.drawer,{transform:[{translateX:drawerX}]}]} {...drag.panHandlers}>
      <SafeAreaView style={{flex:1}}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.drawerContent}>
          <View style={s.accountCard}>
            <Pressable style={s.accountTop} onPress={()=>onSelect('Profile')}><Image source={{uri:me.data?.avatar_url||BLANK}} style={s.menuAvatar}/><Text style={s.accountName}>{me.data?.name||' '}</Text><View style={s.accountChevron}><Ionicons name="chevron-down" size={23}/></View></Pressable>
            <View style={s.accountDivider}/><Pressable style={s.createPage} onPress={()=>onSelect('Create Facebook Page')}><Ionicons name="add-circle" size={37} color="#606770"/><Text style={s.createPageText}>Create Facebook Page</Text></Pressable>
          </View>
          <View style={s.menuList}>{menuItems.map(([label,icon])=><MenuRow key={label} label={label} icon={icon} onPress={()=>onSelect(label)}/>)}</View>
          <Pressable style={s.seeLess} onPress={onClose}><Text style={s.seeLessText}>See less</Text></Pressable>
          <View style={s.drawerDivider}/>
          <Pressable style={s.accordionHead} onPress={()=>setHelpOpen(!helpOpen)}><Ionicons name="help-circle-outline" size={31}/><Text style={s.accordionText}>Help and support</Text><Ionicons name={helpOpen?'chevron-up':'chevron-down'} size={24}/></Pressable>
          {helpOpen&&<View style={s.submenu}><MenuRow label="Help Center" icon="help-buoy-outline" onPress={()=>onSelect('Help Center')}/><MenuRow label="Support inbox" icon="mail-outline" onPress={()=>onSelect('Support inbox')}/></View>}
          <View style={s.drawerDivider}/>
          <Pressable style={s.accordionHead} onPress={()=>setSettingsOpen(!settingsOpen)}><Ionicons name="settings-outline" size={31}/><Text style={s.accordionText}>Settings and privacy</Text><Ionicons name={settingsOpen?'chevron-up':'chevron-down'} size={24}/></Pressable>
          {settingsOpen&&<View style={s.submenu}>{settingsItems.map(([label,icon])=><MenuRow key={label} label={label} icon={icon} onPress={()=>onSelect(label)}/>)}</View>}
          <View style={s.drawerDivider}/><MenuRow label="Upgrades" icon="shapes-outline" onPress={()=>onSelect('Upgrades')}/>
        </ScrollView>
      </SafeAreaView></Animated.View>
    </View>
  </Modal>
}

function FeaturePage({title,onBack}){return <View style={s.page}><Header back onBack={onBack} title={title}/><View style={s.featureEmpty}><View style={s.featureIcon}><Ionicons name="construct-outline" size={34} color={BLUE}/></View><Text style={s.featureTitle}>{title}</Text><Text style={s.featureBody}>This destination is ready for content. Navigation from the menu is working.</Text></View></View>}

export default function App(){
  const [tab,setTab]=useState('home'); const [inbox,setInbox]=useState(false); const [menuOpen,setMenuOpen]=useState(false); const [feature,setFeature]=useState(null);
  const edgeSwipe=useRef(PanResponder.create({
    onMoveShouldSetPanResponder:(_,g)=>g.dx>10&&Math.abs(g.dx)>Math.abs(g.dy),
    onPanResponderRelease:(_,g)=>{if(g.dx>45||g.vx>.55)setMenuOpen(true);}
  })).current;
  const selectMenu=(label)=>{const routes={Marketplace:'market',Groups:'groups',Reels:'reels',Profile:'profile',Friends:'groups',Feeds:'home'}; setMenuOpen(false); setInbox(false); if(routes[label]){setFeature(null);setTab(routes[label]);}else{setFeature(label);}};
  let content=feature==='Nest'?<Nest onExit={()=>setFeature(null)}/>:feature?<FeaturePage title={feature} onBack={()=>setFeature(null)}/>:inbox?<Inbox onBack={()=>setInbox(false)}/>:tab==='home'?<Home openMenu={()=>setMenuOpen(true)}/>:tab==='market'?<Marketplace openInbox={()=>setInbox(true)}/>:tab==='groups'?<Groups/>:tab==='notify'?<Notifications/>:tab==='profile'?<Profile/>:<Reels/>;
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={tab==='reels'&&!feature?'light-content':'dark-content'}/>
      <View style={s.app}>
        {content}
        {tab==='home'&&!inbox&&!feature&&!menuOpen&&<View style={[s.edgeSwipe,{top:58}]} {...edgeSwipe.panHandlers}/>}
        {!inbox&&!feature&&<Nav tab={tab} setTab={x=>{setTab(x);setInbox(false);setFeature(null)}}/>}
        <MenuDrawer visible={menuOpen} onClose={()=>setMenuOpen(false)} onSelect={selectMenu}/>
      </View>
    </SafeAreaView>
  );
}

const x=StyleSheet.create({
 error:{padding:20,color:'#b3261e',textAlign:'center'},empty:{padding:20,textAlign:'center',color:'#626b75'},joined:{backgroundColor:'#e4e6eb'}
});

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#fff'},app:{flex:1,backgroundColor:'#fff'},page:{flex:1,backgroundColor:'#fff'},pressed:{opacity:.55},header:{height:58,flexDirection:'row',alignItems:'center',paddingHorizontal:10,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#e1e4e8'},headerLeft:{flexDirection:'row',alignItems:'center',gap:8,flex:1},headerRight:{flexDirection:'row',gap:5},headerTitle:{fontSize:25,fontWeight:'700'},logo:{color:BLUE,fontSize:37,letterSpacing:-1.5},iconBtn:{width:36,height:36,alignItems:'center',justifyContent:'center',borderRadius:20},badge:{position:'absolute',right:-1,top:-4,backgroundColor:'#e32636',minWidth:18,height:18,borderRadius:10,alignItems:'center',justifyContent:'center'},badgeText:{color:'white',fontSize:11,fontWeight:'700'},edgeSwipe:{position:'absolute',left:0,top:0,bottom:62,width:25,zIndex:25},drawerShell:{flex:1,flexDirection:'row-reverse',backgroundColor:'rgba(0,0,0,.34)'},drawerScrim:{flex:1},drawer:{width:'88%',height:'100%',backgroundColor:'#fff'},drawerContent:{paddingTop:12,paddingBottom:22},accountCard:{marginHorizontal:14,borderRadius:16,backgroundColor:'#fff',shadowColor:'#000',shadowOpacity:.12,shadowRadius:10,shadowOffset:{width:0,height:3},elevation:5,borderWidth:StyleSheet.hairlineWidth,borderColor:'#e2e4e7'},accountTop:{height:82,flexDirection:'row',alignItems:'center',paddingHorizontal:15,gap:14},menuAvatar:{width:49,height:49,borderRadius:26},accountName:{fontSize:22,fontWeight:'600',flex:1},accountChevron:{width:43,height:43,borderRadius:24,backgroundColor:'#e4e6eb',alignItems:'center',justifyContent:'center'},accountDivider:{height:StyleSheet.hairlineWidth,backgroundColor:'#d5d8dc'},createPage:{height:63,flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:18},createPageText:{fontSize:20,fontWeight:'600',color:'#606770'},menuList:{paddingTop:20},menuRow:{height:66,flexDirection:'row',alignItems:'center',paddingHorizontal:22,gap:18},menuRowPressed:{backgroundColor:'#f0f2f5'},menuLabel:{fontSize:20,fontWeight:'500'},seeLess:{marginHorizontal:14,marginVertical:8,height:48,borderRadius:9,backgroundColor:'#e4e6eb',alignItems:'center',justifyContent:'center'},seeLessText:{fontSize:18,fontWeight:'700'},drawerDivider:{height:1,backgroundColor:'#d4d7db'},accordionHead:{height:72,flexDirection:'row',alignItems:'center',paddingHorizontal:18,gap:16},accordionText:{fontSize:21,fontWeight:'600',flex:1},submenu:{paddingBottom:6},featureEmpty:{flex:1,alignItems:'center',justifyContent:'center',padding:35},featureIcon:{width:70,height:70,borderRadius:35,backgroundColor:'#e7f3ff',alignItems:'center',justifyContent:'center'},featureTitle:{fontSize:24,fontWeight:'700',marginTop:18},featureBody:{fontSize:16,color:'#626b75',textAlign:'center',lineHeight:23,marginTop:8},
 nav:{height:62,borderTopWidth:1,borderColor:'#d8dde3',backgroundColor:'white',flexDirection:'row',paddingBottom:4},navItem:{flex:1,alignItems:'center'},navTop:{height:36,width:'100%',alignItems:'center',justifyContent:'center',borderTopWidth:2,borderColor:'transparent'},navActive:{borderColor:BLUE},navText:{fontSize:9},composer:{flexDirection:'row',alignItems:'center',gap:12,padding:12},avatar:{width:44,height:44,borderRadius:24},composerText:{flex:1,fontSize:18},stories:{padding:8,gap:8},story:{width:120,height:190,borderRadius:13,overflow:'hidden',backgroundColor:'#f1f2f5',borderWidth:1,borderColor:'#ddd'},storyImage:{width:'100%',height:120},storyFull:{width:'100%',height:'100%'},plus:{position:'absolute',top:101,left:43,width:38,height:38,borderRadius:22,backgroundColor:BLUE,borderWidth:3,borderColor:'white',alignItems:'center',justifyContent:'center'},createStory:{textAlign:'center',fontSize:16,fontWeight:'700',marginTop:24},storyAvatar:{position:'absolute',top:10,left:10,width:38,height:38,borderRadius:20,borderWidth:3,borderColor:BLUE},storyName:{position:'absolute',bottom:8,left:8,color:'white',fontSize:15,fontWeight:'700',textShadowColor:'#000',textShadowRadius:5},post:{borderTopWidth:7,borderColor:'#dfe3e8',paddingTop:10},postHead:{flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:10},
 bold:{fontWeight:'700',fontSize:16},muted:{color:'#626b75'},postTitle:{fontSize:20,fontWeight:'700',lineHeight:26,padding:10,paddingBottom:4},body:{fontSize:17,lineHeight:23,paddingHorizontal:10,paddingBottom:10},photoGrid:{height:270,flexDirection:'row',gap:2},postPhoto:{flex:1,height:'100%'},actions:{flexDirection:'row',justifyContent:'space-between',padding:10,borderBottomWidth:1,borderColor:'#e4e6eb'},actionRow:{flexDirection:'row',height:42},action:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},chips:{height:45,flexDirection:'row',alignItems:'center',gap:20,paddingHorizontal:10},chip:{fontSize:15},chipOn:{color:BLUE,backgroundColor:'#e7f3ff',paddingHorizontal:14,paddingVertical:8,borderRadius:18},productGrid:{flexDirection:'row',flexWrap:'wrap'},product:{width:'50%',borderWidth:.5,borderColor:'white'},productImg:{width:'100%',height:205,backgroundColor:'#eee'},productText:{padding:5,fontSize:13},notice:{margin:8,padding:10,borderRadius:12,backgroundColor:'#f0f2f5',flexDirection:'row',gap:9,alignItems:'center'},small:{fontSize:12,color:'#626b75'},thread:{flexDirection:'row',alignItems:'center',padding:8,gap:10},threadImg:{width:55,height:55,borderRadius:30},threadTitle:{fontSize:16,fontWeight:'600'},threadSub:{fontSize:13},dot:{width:9,height:9,borderRadius:5,backgroundColor:BLUE},subnav:{flexDirection:'row',justifyContent:'space-around',paddingVertical:8},subtab:{padding:9,fontSize:13},subOn:{backgroundColor:'#e7f3ff',color:BLUE,borderRadius:18},sectionTitle:{flexDirection:'row',justifyContent:'space-between',padding:10,alignItems:'center'},groupRow:{flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:9,height:58},groupImg:{width:42,height:42,borderRadius:8},groupName:{fontWeight:'600'},filterRow:{flexDirection:'row',gap:10,padding:9},filter:{paddingHorizontal:13,paddingVertical:8},filterOn:{backgroundColor:'#e7f3ff',color:BLUE,borderRadius:18},activityGrid:{flexDirection:'row',flexWrap:'wrap',padding:6},activityCard:{width:'50%',padding:8,borderWidth:1,borderColor:'#ddd',borderRadius:10,minHeight:160},smallBold:{fontSize:12,fontWeight:'700'},suggestGrid:{flexDirection:'row',flexWrap:'wrap',padding:7},suggest:{width:'50%',padding:5},suggestImg:{height:150,width:'100%',borderRadius:10},join:{backgroundColor:BLUE,alignItems:'center',padding:9,borderRadius:6,marginTop:5},note:{minHeight:64,backgroundColor:'#e7f3ff',flexDirection:'row',alignItems:'center',gap:9,padding:7},noteAvatar:{width:46,height:46,borderRadius:25},noteText:{flex:1,fontSize:13},push:{flexDirection:'row',alignItems:'center',gap:8,padding:7,borderTopWidth:1,borderColor:'#ddd'},turnOn:{color:'white',backgroundColor:BLUE,padding:10,borderRadius:7},cover:{height:220,backgroundColor:'#aaa'},coverImg:{width:'100%',height:'100%',opacity:.72},profileTools:{position:'absolute',top:15,left:10,right:10,flexDirection:'row',gap:22},profilePic:{position:'absolute',width:120,height:120,borderRadius:60,bottom:-55,left:W/2-60,borderWidth:4,borderColor:'white'},profileName:{fontSize:24,fontWeight:'700',textAlign:'center',marginTop:64},center:{textAlign:'center'},profileBtns:{flexDirection:'row',gap:7,padding:10},blueBtn:{flex:1,textAlign:'center',backgroundColor:BLUE,color:'white',fontWeight:'600',padding:11,borderRadius:7},grayBtn:{flex:1,textAlign:'center',backgroundColor:'#e4e6eb',fontWeight:'600',padding:11,borderRadius:7},profileTabs:{flexDirection:'row',gap:8,paddingHorizontal:10},profileTab:{padding:10},detail:{paddingHorizontal:12,paddingVertical:7,fontSize:15},friendRow:{flexDirection:'row',padding:8,gap:10},friend:{width:(W-50)/4},friendImg:{width:'100%',aspectRatio:1,borderRadius:9},reelBg:{position:'absolute',width:'100%',height:'100%'},reelTop:{position:'absolute',top:15,left:12,right:12,flexDirection:'row',alignItems:'center',gap:15},reelTitle:{fontSize:26,fontWeight:'700',color:'white'},reelText:{position:'absolute',bottom:20,left:12},reelCaption:{color:'white',fontSize:24,fontWeight:'700',marginBottom:250},reelActions:{position:'absolute',right:14,bottom:30,gap:22},reelCount:{color:'white',fontSize:12,marginTop:3}
});
