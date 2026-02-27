export default function NavigateScreen(props: { payload: unknown; onBack: () => void }) {
    return <div class="screen-navigate"><button onClick={props.onBack}>← Back</button><p>AR Navigation — Week 4</p></div>
}
