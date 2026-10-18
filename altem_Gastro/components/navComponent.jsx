import {View ,Text,Image,StyleSheet} from 'react-native';
import { Link } from 'expo-router';

export default function Navigation(){
    return(
        <View>
            <Image source={require("")} />
            <Link href="/menu">
                <Text style={styles.linkText}>Menu</Text>
            </Link>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    linkText: {
        color: 'blue',
    }
});