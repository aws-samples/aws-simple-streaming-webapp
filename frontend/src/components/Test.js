import React, {useEffect} from 'react'






export default function Test(props) {

  const rtmpURL = props.location.state.rtmpURL

  useEffect(() => {
    console.log('Redered!', props, rtmpURL)
  }, [])

  return (
    <div>
      Test!
      
    </div>
  )
}

  
